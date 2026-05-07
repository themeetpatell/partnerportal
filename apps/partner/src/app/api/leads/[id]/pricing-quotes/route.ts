import { auth } from "@repo/auth/server"
import { rateLimit } from "@repo/auth"
import {
  createPricingEngineQuote,
  isPricingEngineIntegrationsEnabled,
  partnerLeadMayCreatePricingQuote,
} from "@repo/pricing-integration"
import {
  db,
  isPostgresUniqueViolation,
  leadQuotes,
  leads,
  partners,
} from "@repo/db"
import { mergeLeadContactNamesForDisplay } from "@repo/types"
import { and, desc, eq, isNull } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

function parseServiceHints(raw: string): string[] {
  try {
    const arr = JSON.parse(raw) as unknown
    return Array.isArray(arr)
      ? arr.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : []
  } catch {
    return []
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [partner] = await db
    .select()
    .from(partners)
    .where(and(eq(partners.authUserId, userId), isNull(partners.deletedAt)))
    .limit(1)

  if (!partner || partner.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: leadId } = await params

  const [lead] = await db
    .select()
    .from(leads)
    .where(
      and(eq(leads.id, leadId), eq(leads.partnerId, partner.id), isNull(leads.deletedAt)),
    )
    .limit(1)

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const rows = await db
    .select()
    .from(leadQuotes)
    .where(and(eq(leadQuotes.leadId, leadId), isNull(leadQuotes.deletedAt)))
    .orderBy(desc(leadQuotes.updatedAt))

  return NextResponse.json({ quotes: rows, integrationsEnabled: isPricingEngineIntegrationsEnabled() })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`partner-lead-quote:${userId}`, 20, 60_000)
  if (limited) return limited

  const [partner] = await db
    .select()
    .from(partners)
    .where(and(eq(partners.authUserId, userId), isNull(partners.deletedAt)))
    .limit(1)

  if (!partner || partner.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!isPricingEngineIntegrationsEnabled()) {
    return NextResponse.json(
      {
        error:
          "Pricing engine is not configured. Contact Finanshels if proposals should be available.",
      },
      { status: 503 },
    )
  }

  const { id: leadId } = await params

  const [lead] = await db
    .select()
    .from(leads)
    .where(
      and(eq(leads.id, leadId), eq(leads.partnerId, partner.id), isNull(leads.deletedAt)),
    )
    .limit(1)

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  if (!partnerLeadMayCreatePricingQuote(lead.status)) {
    return NextResponse.json(
      {
        error:
          "This lead is not eligible for a partner-initiated proposal yet. Wait until the lead is approved or further along the pipeline.",
      },
      { status: 403 },
    )
  }

  if (lead.status === "deal_won" || lead.status === "deal_lost") {
    return NextResponse.json({ error: "Cannot create a proposal for a closed lead." }, { status: 409 })
  }

  const tenantId = partner.tenantId
  const idempotencyKey = `${tenantId}:${leadId}:portal:partner:${userId}:create`

  const contact = mergeLeadContactNamesForDisplay(lead)

  const engineResp = await createPricingEngineQuote({
    tenant_id: tenantId,
    partner_id: partner.id,
    external_lead_id: lead.id,
    partner_promo_code: partner.promoCode ?? null,
    customer: {
      company: lead.customerCompany,
      email: lead.customerEmail,
      phone: lead.customerPhone,
      first_name: contact.firstName ?? null,
      last_name: contact.lastName ?? null,
      full_name: lead.customerName,
    },
    service_hints: parseServiceHints(lead.serviceInterest),
    requested_by: {
      auth_user_id: userId,
      role: "partner",
    },
    idempotency_key: idempotencyKey,
  })

  if (!engineResp.ok) {
    return NextResponse.json(
      { error: engineResp.error },
      { status: engineResp.status && engineResp.status >= 400 ? engineResp.status : 502 },
    )
  }

  const now = new Date()
  try {
    const [created] = await db
      .insert(leadQuotes)
      .values({
        tenantId,
        leadId: lead.id,
        engineQuoteId: engineResp.engine_quote_id,
        engineQuoteNumber: engineResp.engine_quote_number ?? null,
        deepLinkUrl:
          engineResp.deep_link_url ??
          engineResp.proposal_view_url ??
          null,
        proposalViewUrl: engineResp.proposal_view_url ?? null,
        idempotencyKey,
        syncStatus: "synced",
        lastSyncedAt: now,
        createdByAuthUserId: userId,
        createdBySource: "partner",
        updatedAt: now,
      })
      .returning()

    return NextResponse.json({ quote: created })
  } catch (e) {
    if (isPostgresUniqueViolation(e)) {
      const [existing] = await db
        .select()
        .from(leadQuotes)
        .where(
          and(
            eq(leadQuotes.tenantId, tenantId),
            eq(leadQuotes.idempotencyKey, idempotencyKey),
            isNull(leadQuotes.deletedAt),
          ),
        )
        .limit(1)
      return NextResponse.json({
        quote: existing ?? null,
        idempotentReplay: true,
      })
    }
    throw e
  }
}
