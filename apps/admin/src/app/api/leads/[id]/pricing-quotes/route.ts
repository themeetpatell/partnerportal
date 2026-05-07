import { auth } from "@repo/auth/server"
import { rateLimit } from "@repo/auth"
import {
  createPricingEngineQuote,
  isPricingEngineIntegrationsEnabled,
} from "@repo/pricing-integration"
import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, isNull } from "drizzle-orm"
import {
  db,
  isPostgresUniqueViolation,
  leadQuotes,
  leads,
  partners,
} from "@repo/db"
import { mergeLeadContactNamesForDisplay } from "@repo/types"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, LEAD_PIPELINE_ROLES } from "@/lib/rbac"

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

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, LEAD_PIPELINE_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()
  const { id: leadId } = await params

  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(eq(leads.id, leadId), eq(leads.tenantId, tenantId), isNull(leads.deletedAt)),
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

  const limited = rateLimit(`lead-pricing-quote-create:${userId}`, 25, 60_000)
  if (limited) return limited

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, LEAD_PIPELINE_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!isPricingEngineIntegrationsEnabled()) {
    return NextResponse.json(
      {
        error:
          "Pricing engine is not configured (set PRICING_ENGINE_BASE_URL and PRICING_ENGINE_API_KEY).",
      },
      { status: 503 },
    )
  }

  const tenantId = getRequiredTenantId()
  const { id: leadId } = await params

  const [row] = await db
    .select({
      lead: leads,
      partner: partners,
    })
    .from(leads)
    .innerJoin(partners, eq(partners.id, leads.partnerId))
    .where(
      and(eq(leads.id, leadId), eq(leads.tenantId, tenantId), isNull(leads.deletedAt)),
    )
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const { lead, partner } = row

  if (lead.status === "deal_won" || lead.status === "deal_lost") {
    return NextResponse.json(
      { error: "Cannot create a proposal for a closed lead." },
      { status: 409 },
    )
  }

  const idempotencyKey = `${tenantId}:${leadId}:portal:create`

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
      role: "admin",
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
        createdBySource: "admin",
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
