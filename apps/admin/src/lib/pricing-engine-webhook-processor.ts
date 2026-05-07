import {
  db,
  leadNotes,
  leadQuotes,
  leads,
  partners,
  pricingEngineWebhookEvents,
} from "@repo/db"
import { LEAD_STATUS_TRANSITIONS, type LeadStatus } from "@repo/types"
import { isPricingEngineAutoPipeline, type PricingEngineWebhookPayload } from "@repo/pricing-integration"
import { and, eq, isNull } from "drizzle-orm"
import { createDealCloseCommissionFromLead } from "@/lib/create-lead-commissions"

const SYSTEM_ACTOR_ID = "system:pricing-engine"
const SYSTEM_ACTOR_NAME = "Pricing engine"

function parseIsoDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Map engine event type slugs to portal pipeline targets (conservative). */
function inferDesiredLeadStatus(eventType: string): LeadStatus | null {
  const t = eventType.toLowerCase().trim()

  if (
    t.endsWith("quote.sent") ||
    t.endsWith("proposal.sent") ||
    t.endsWith("quote.viewed") ||
    t.endsWith("proposal.viewed")
  ) {
    return "proposal_sent"
  }

  if (
    t.endsWith("payment.completed") ||
    t.endsWith("quote.won") ||
    t.endsWith("deal.won") ||
    t === "won"
  ) {
    return "deal_won"
  }

  if (
    t.endsWith("quote.lost") ||
    t.endsWith("proposal.lost") ||
    t.endsWith("deal.lost") ||
    t.endsWith("quote.expired")
  ) {
    return "deal_lost"
  }

  return null
}

function coercePaymentAmountSnippet(data: Record<string, unknown>): string | null {
  const v = data.payment_amount ?? data.amount ?? data.paymentAmount
  if (typeof v === "number" && Number.isFinite(v)) return String(v)
  if (typeof v === "string" && v.trim()) return v.trim()
  return null
}

export async function processPricingEngineWebhook(
  parsed: PricingEngineWebhookPayload,
): Promise<
  | { ok: true; duplicate?: boolean }
  | { ok: false; error: string }
> {
  const data = parsed.data
  const tenantId = parsed.tenant_id

  const [dedupeInserted] = await db
    .insert(pricingEngineWebhookEvents)
    .values({
      tenantId,
      engineEventId: parsed.id,
      eventType: parsed.type,
      quoteId: data.quote_id,
    })
    .onConflictDoNothing()
    .returning({ id: pricingEngineWebhookEvents.id })

  if (!dedupeInserted) {
    return { ok: true, duplicate: true }
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.id, data.external_lead_id),
        eq(leads.tenantId, tenantId),
        isNull(leads.deletedAt),
      ),
    )
    .limit(1)

  if (!lead) {
    return { ok: false, error: "Lead not found for external_lead_id in this tenant." }
  }

  const now = new Date()
  const engineTs = parseIsoDate(parsed.occurred_at) ?? now

  const [existingQuote] = await db
    .select()
    .from(leadQuotes)
    .where(
      and(
        eq(leadQuotes.tenantId, tenantId),
        eq(leadQuotes.engineQuoteId, data.quote_id),
        isNull(leadQuotes.deletedAt),
      ),
    )
    .limit(1)

  const totalDisplayNext = data.total_display ?? existingQuote?.totalDisplay ?? null
  const pdfNext = data.pdf_url ?? existingQuote?.pdfUrl ?? null
  const viewNext = data.proposal_view_url ?? existingQuote?.proposalViewUrl ?? null
  const deepNext = existingQuote?.deepLinkUrl ?? viewNext ?? null

  const quotePatch = {
    proposalStatus: data.status ?? existingQuote?.proposalStatus ?? null,
    totalDisplay: totalDisplayNext,
    currency: data.currency ?? existingQuote?.currency ?? "AED",
    expiresAt:
      parseIsoDate(data.expires_at ?? undefined) ?? existingQuote?.expiresAt ?? null,
    proposalViewUrl: viewNext,
    pdfUrl: pdfNext,
    deepLinkUrl: deepNext,
    engagementLetterStatus:
      data.engagement_letter_status ?? existingQuote?.engagementLetterStatus ?? null,
    stripePaymentStatus:
      data.stripe_payment_status ?? existingQuote?.stripePaymentStatus ?? null,
    onboardingPushedAt:
      parseIsoDate(data.onboarding_pushed_at ?? undefined) ??
      existingQuote?.onboardingPushedAt ??
      null,
    enginePayloadUpdatedAt: engineTs,
    lastSyncedAt: now,
    updatedAt: now,
    metaJson: JSON.stringify(parsed),
    syncStatus: "synced",
  }

  if (existingQuote) {
    await db
      .update(leadQuotes)
      .set(quotePatch)
      .where(eq(leadQuotes.id, existingQuote.id))
  } else {
    await db.insert(leadQuotes).values({
      tenantId,
      leadId: lead.id,
      engineQuoteId: data.quote_id,
      engineQuoteNumber: data.quote_number ?? null,
      deepLinkUrl: viewNext ?? null,
      syncStatus: "synced",
      proposalStatus: data.status ?? null,
      totalDisplay: totalDisplayNext,
      currency: data.currency ?? "AED",
      expiresAt: parseIsoDate(data.expires_at ?? undefined),
      proposalViewUrl: viewNext,
      pdfUrl: pdfNext,
      engagementLetterStatus: data.engagement_letter_status ?? null,
      stripePaymentStatus: data.stripe_payment_status ?? null,
      onboardingPushedAt: parseIsoDate(data.onboarding_pushed_at ?? undefined),
      enginePayloadUpdatedAt: engineTs,
      lastSyncedAt: now,
      metaJson: JSON.stringify(parsed),
      createdBySource: "webhook",
      updatedAt: now,
    })
  }

  await db.insert(leadNotes).values({
    tenantId,
    leadId: lead.id,
    authorId: SYSTEM_ACTOR_ID,
    authorName: SYSTEM_ACTOR_NAME,
    note: `[Pricing engine] ${parsed.type}${data.status ? ` — ${data.status}` : ""} (quote ${data.quote_number ?? data.quote_id})`,
    updatedAt: now,
  })

  const targetStatus = inferDesiredLeadStatus(parsed.type)
  if (targetStatus && isPricingEngineAutoPipeline()) {
    await applyLeadPipelineTransition({
      tenantId,
      lead,
      targetStatus,
      webhookData: data as Record<string, unknown>,
    })
  }

  return { ok: true }
}

async function applyLeadPipelineTransition(opts: {
  tenantId: string
  lead: typeof leads.$inferSelect
  targetStatus: LeadStatus
  webhookData: Record<string, unknown>
}) {
  const { tenantId, lead, targetStatus, webhookData } = opts

  const current = lead.status as LeadStatus

  /* Don't revive terminal leads via automation */
  if (current === "deal_won" || current === "deal_lost") {
    return
  }

  if (current === targetStatus) {
    await touchLeadContextOnly(lead.id, webhookData)
    return
  }

  if (!PIPELINE_TRANSITIONSAllows(current, targetStatus)) {
    return
  }

  const nextStatus = targetStatus
  const now = new Date()

  const patch: Partial<typeof leads.$inferInsert> & { updatedAt: Date } = {
    status: nextStatus,
    stageUpdatedAt: now,
    updatedAt: now,
  }

  if (nextStatus === "proposal_sent") {
    patch.proposalSentAt = lead.proposalSentAt ?? now
    const qn =
      (typeof webhookData.quote_number === "string" && webhookData.quote_number.trim()) ||
      String(webhookData.quote_id ?? "")
    if (qn) {
      patch.proposalSummary = `Proposal ${qn}`
    }
  }

  if (nextStatus === "deal_won") {
    patch.convertedAt = lead.convertedAt ?? now
    patch.paymentDate = lead.paymentDate ?? now
    patch.paymentStatus = "paid"
    const amt = coercePaymentAmountSnippet(webhookData)
    if (amt) patch.paymentAmount = amt
  }

  if (nextStatus === "deal_lost") {
    patch.rejectionReason =
      (typeof webhookData.reason === "string" && webhookData.reason.trim()) ||
      "Marked lost from pricing engine webhook."
    patch.lostReason = patch.rejectionReason
  }

  const [updatedLead] = await db
    .update(leads)
    .set(patch)
    .where(
      and(
        eq(leads.id, lead.id),
        eq(leads.tenantId, tenantId),
        isNull(leads.deletedAt),
      ),
    )
    .returning()

  if (
    nextStatus === "deal_won" &&
    updatedLead &&
    updatedLead.status === "deal_won"
  ) {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.id, updatedLead.partnerId))
      .limit(1)
    if (partner) {
      const amtRaw = coercePaymentAmountSnippet(webhookData)
      const amtParsed =
        amtRaw != null ? Number(String(amtRaw).replace(/,/g, "")) : Number.NaN

      const commissionResult = await createDealCloseCommissionFromLead({
        lead: updatedLead,
        partner,
        actorUserId: SYSTEM_ACTOR_ID,
        actorName: SYSTEM_ACTOR_NAME,
        basisAmountOverride:
          Number.isFinite(amtParsed) && amtParsed > 0 ? amtParsed : undefined,
        snapshotSource: "pricing_engine_webhook",
        logNote: "Deal-close commission created from pricing engine automation.",
      })
      if (!commissionResult.ok && commissionResult.reason !== "duplicate") {
        console.warn(
          "[pricing-engine-webhook] deal_won commission not created:",
          commissionResult.reason,
          "leadId=",
          updatedLead.id,
        )
      }
    }
  }
}

function PIPELINE_TRANSITIONSAllows(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

/** Update proposal/payment timestamps without advancing stage when already at desired. */
async function touchLeadContextOnly(
  leadId: string,
  webhookData: Record<string, unknown>,
) {
  const now = new Date()
  const [current] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)))
    .limit(1)

  if (!current) return

  if (!current.proposalSentAt) {
    await db
      .update(leads)
      .set({
        proposalSentAt: now,
        updatedAt: now,
      })
      .where(eq(leads.id, leadId))
  }

  if (current.status === "deal_won") {
    const amt = coercePaymentAmountSnippet(webhookData)
    if (amt && !current.paymentAmount) {
      await db
        .update(leads)
        .set({
          paymentAmount: amt,
          paymentStatus: "paid",
          updatedAt: now,
        })
        .where(eq(leads.id, leadId))
    }
  }
}
