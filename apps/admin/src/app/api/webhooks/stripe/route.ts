import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import Stripe from "stripe"
import { db, commissions, leads, partners } from "@repo/db"
import { and, eq } from "drizzle-orm"
import { calculateCommission } from "@repo/commission-engine"
import { getCommissionVatOptionsFromEnv } from "@/lib/commission-env"
import {
  countPartnerDealWonLeads,
  resolvePartnerCommissionModel,
} from "@/lib/partner-commission-resolution"
import { commissionBasisFromStripeInvoice } from "@/lib/stripe-commission-basis"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LEAD_ID_META = "partner_portal_lead_id"

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  )
}

async function resolveLeadIdFromInvoice(invoice: Stripe.Invoice, stripe: Stripe): Promise<string | null> {
  const direct = invoice.metadata?.[LEAD_ID_META]?.trim()
  if (direct && isUuid(direct)) {
    return direct
  }

  const subRef = invoice.subscription
  const subId = typeof subRef === "string" ? subRef : subRef?.id
  if (!subId) {
    return null
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subId)
    const fromSub = subscription.metadata?.[LEAD_ID_META]?.trim()
    return fromSub && isUuid(fromSub) ? fromSub : null
  } catch (err) {
    console.error("[stripe-webhook] Failed to load subscription for lead metadata", err)
    return null
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!secret || !apiKey) {
    console.error("[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  const stripe = new Stripe(apiKey)
  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice

    const [duplicate] = await db
      .select({ id: commissions.id })
      .from(commissions)
      .where(eq(commissions.stripeInvoiceId, invoice.id))
      .limit(1)

    if (duplicate) {
      return NextResponse.json({ received: true, linked: true, commissionId: duplicate.id })
    }

    const leadId = await resolveLeadIdFromInvoice(invoice, stripe)
    if (!leadId) {
      return NextResponse.json({ received: true, linked: false })
    }

    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)

    if (!lead) {
      console.warn("[stripe-webhook] lead id from metadata not found", leadId)
      return NextResponse.json({ received: true, linked: false })
    }

    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.id, lead.partnerId))
      .limit(1)

    if (!partner) {
      console.warn("[stripe-webhook] partner not found for lead", leadId)
      return NextResponse.json({ received: true, linked: false })
    }

    const [primaryCommission] = await db
      .select()
      .from(commissions)
      .where(and(eq(commissions.sourceType, "lead"), eq(commissions.sourceId, leadId)))
      .limit(1)

    const snapStripeLink = {
      stripeInvoicePaidAt: new Date().toISOString(),
      stripeInvoiceAmountPaid: invoice.amount_paid ?? null,
      stripeInvoiceCurrency: invoice.currency ?? null,
    }

    // First receipt: attach to CRM-created lead row when present.
    if (primaryCommission && !primaryCommission.stripeInvoiceId?.trim()) {
      const snap =
        (primaryCommission.calculationSnapshot as Record<string, unknown> | null | undefined) ??
        {}

      await db
        .update(commissions)
        .set({
          stripeInvoiceId: invoice.id,
          calculationSnapshot: { ...snap, ...snapStripeLink },
          updatedAt: new Date(),
        })
        .where(eq(commissions.id, primaryCommission.id))

      return NextResponse.json({
        received: true,
        linked: true,
        commissionId: primaryCommission.id,
        mode: "primary_linked",
      })
    }

    // No CRM commission yet — temporary row until Zoho sync runs (avoid zero partner visibility).
    if (!primaryCommission) {
      console.warn(
        "[stripe-webhook] No primary lead commission row; creating provisional Stripe commission until CRM sync.",
        leadId,
      )
      const commissionModel = await resolvePartnerCommissionModel(partner)
      const vatOpts = getCommissionVatOptionsFromEnv()
      const basis = commissionBasisFromStripeInvoice(invoice, vatOpts)

      if (basis.netForCommission <= 0 || !commissionModel) {
        return NextResponse.json({ received: true, linked: false })
      }

      const conversions = await countPartnerDealWonLeads(partner.id)

      const commissionResult = calculateCommission({
        model: commissionModel,
        serviceFee: basis.netForCommission,
        partnerConversionsThisPeriod: conversions,
        partnerLifetimeConversions: conversions,
      })

      if (commissionResult.amount <= 0) {
        return NextResponse.json({ received: true, linked: false })
      }

      const calculationSnapshot = {
        version: 1,
        source: "stripe_invoice_paid_placeholder",
        leadId,
        stripeOnlyUntilCrmSynced: true,
        stripeInvoiceId: invoice.id,
        grossStripeMajor: basis.grossFromCrm,
        netForCommission: basis.netForCommission,
        vatRatePct: basis.vatRatePct,
        crmAmountIncludesVatApplied: basis.crmAmountIncludesVat,
        stripeTaxExcluded: basis.stripeTaxExcluded,
      }

      let inserted
      try {
        ;[inserted] = await db
          .insert(commissions)
          .values({
            tenantId: partner.tenantId,
            partnerId: partner.id,
            sourceType: "lead_recurring_invoice",
            sourceId: randomUUID(),
            relatedLeadId: leadId,
            amount: String(commissionResult.amount),
            currency: (invoice.currency ?? "aed").toUpperCase(),
            status: "pending",
            breakdown: `${basis.summaryLine}. ${commissionResult.breakdown}`,
            calculationSnapshot,
            stripeInvoiceId: invoice.id,
            calculatedAt: new Date(),
          })
          .returning()
      } catch (e) {
        console.warn("[stripe-webhook] provisional insert failed (possible race)", invoice.id, e)
        return NextResponse.json({ received: true, linked: false })
      }

      return NextResponse.json({
        received: true,
        linked: true,
        commissionId: inserted?.id,
        mode: "stripe_placeholder",
      })
    }

    // Recurring billing cycle (or CRM row already linked to a different invoice).
    const commissionModel = await resolvePartnerCommissionModel(partner)
    const vatOpts = getCommissionVatOptionsFromEnv()
    const basis = commissionBasisFromStripeInvoice(invoice, vatOpts)

    if (basis.netForCommission <= 0 || !commissionModel) {
      console.warn("[stripe-webhook] Skipping recurring commission — no basis or commission model.", leadId)
      return NextResponse.json({ received: true, linked: false })
    }

    const conversions = await countPartnerDealWonLeads(partner.id)

    const commissionResult = calculateCommission({
      model: commissionModel,
      serviceFee: basis.netForCommission,
      partnerConversionsThisPeriod: conversions,
      partnerLifetimeConversions: conversions,
    })

    if (commissionResult.amount <= 0) {
      return NextResponse.json({ received: true, linked: false })
    }

    const calculationSnapshot = {
      version: 1,
      source: "stripe_invoice_paid_recurring",
      leadId,
      stripeInvoiceId: invoice.id,
      grossStripeMajor: basis.grossFromCrm,
      netForCommission: basis.netForCommission,
      vatRatePct: basis.vatRatePct,
      crmAmountIncludesVatApplied: basis.crmAmountIncludesVat,
      stripeTaxExcluded: basis.stripeTaxExcluded,
    }

    let insertedRow
    try {
      ;[insertedRow] = await db
        .insert(commissions)
        .values({
          tenantId: partner.tenantId,
          partnerId: partner.id,
          sourceType: "lead_recurring_invoice",
          sourceId: randomUUID(),
          relatedLeadId: leadId,
          amount: String(commissionResult.amount),
          currency: (invoice.currency ?? "aed").toUpperCase(),
          status: "pending",
          breakdown: `${basis.summaryLine}. ${commissionResult.breakdown}`,
          calculationSnapshot,
          stripeInvoiceId: invoice.id,
          calculatedAt: new Date(),
        })
        .returning()
    } catch (e) {
      console.error("[stripe-webhook] recurring commission insert failed", e)
      return NextResponse.json({ received: true, linked: false })
    }

    return NextResponse.json({
      received: true,
      linked: true,
      commissionId: insertedRow?.id,
      mode: "recurring_created",
    })
  }

  return NextResponse.json({ received: true })
}
