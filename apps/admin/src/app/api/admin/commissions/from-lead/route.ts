import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { calculateCommission, deriveNetCommissionBaseFromCrm } from "@repo/commission-engine"
import { db, commissions, leads, logActivity, partners } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getCommissionVatOptionsFromEnv } from "@/lib/commission-env"
import { getRequiredTenantId } from "@/lib/env"
import {
  countPartnerDealWonLeads,
  resolvePartnerCommissionModel,
} from "@/lib/partner-commission-resolution"
import { hasAnyTeamRole, FINANCE_ROLES } from "@/lib/rbac"
import { isPartnerReadable, resolvePartnerScopeForActor } from "@/lib/row-scope"

const FAILURE_MESSAGES: Record<string, string> = {
  duplicate: "A deal-close commission already exists for this lead.",
  not_deal_won: "Mark the lead as deal won before creating a commission.",
  no_basis:
    "Set payment amount or proposal amount on the lead, or enter an explicit basis amount.",
  no_model: "Partner has no valid commission model or rate configured.",
  no_partner: "Partner record not found for this lead.",
  forbidden_scope: "This partner is outside your row scope.",
  zero_commission: "Calculated commission is zero — check commission model and basis amount.",
  server: "Commission could not be created. Try again or check logs.",
}

function redirectLead(
  req: NextRequest,
  path: string,
  params: Record<string, string>,
): NextResponse {
  const u = new URL(path.startsWith("/") ? path : `/${path}`, req.url)
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, v)
  }
  return NextResponse.redirect(u, 303)
}

async function parsePayload(req: NextRequest): Promise<{
  leadId: string
  recurring: boolean
  basisAmount?: number
  redirectTo?: string
  isJson: boolean
}> {
  const contentType = req.headers.get("content-type") ?? ""
  const isJson = contentType.includes("application/json")

  if (isJson) {
    const body = (await req.json()) as Record<string, unknown>
    const rawBasis = body.basisAmount
    const parsed =
      rawBasis != null && rawBasis !== ""
        ? Number(rawBasis)
        : undefined

    return {
      leadId: String(body.leadId ?? "").trim(),
      recurring: Boolean(body.recurring),
      basisAmount:
        parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
      redirectTo:
        typeof body.redirectTo === "string" && body.redirectTo.startsWith("/")
          ? body.redirectTo
          : undefined,
      isJson: true,
    }
  }

  const formData = await req.formData()
  const rawBasisField = formData.get("basisAmount")
  const fromForm =
    rawBasisField != null && String(rawBasisField).trim() !== ""
      ? Number(String(rawBasisField))
      : undefined

  return {
    leadId: String(formData.get("leadId") ?? "").trim(),
    recurring:
      formData.get("recurring") === "1" ||
      formData.get("recurring") === "on",
    basisAmount:
      fromForm !== undefined && Number.isFinite(fromForm)
        ? fromForm
        : undefined,
    redirectTo: String(formData.get("redirectTo") ?? "").trim() || undefined,
    isJson: false,
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`admin-commissions-from-lead:${userId}`, 30, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)
  const tenantId = getRequiredTenantId()

  if (!member || !hasAnyTeamRole(member.role, FINANCE_ROLES)) {
    const msg = "Forbidden — Finance/Admin only"
    return NextResponse.json({ error: msg }, { status: 403 })
  }

  let payload: Awaited<ReturnType<typeof parsePayload>>
  try {
    payload = await parsePayload(req)
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { leadId, recurring, basisAmount, isJson } = payload
  const redirectBase =
    payload.redirectTo?.startsWith("/") === true ? payload.redirectTo : `/leads/${leadId || ""}`

  const fail = (reason: keyof typeof FAILURE_MESSAGES, statusJson: number) => {
    const message = FAILURE_MESSAGES[reason]
    if (isJson) {
      return NextResponse.json({ error: message, reason }, { status: statusJson })
    }
    return redirectLead(req, redirectBase || `/leads/${leadId}`, {
      commission: "error",
      commissionReason: reason,
    })
  }

  const ok = (
    commission: typeof commissions.$inferSelect,
    statusJson: number,
  ) => {
    if (isJson) return NextResponse.json(commission, { status: statusJson })
    const target =
      redirectBase && redirectBase.startsWith("/") ? redirectBase : `/leads/${leadId}`
    return redirectLead(req, target, { commission: "ok" })
  }

  if (!leadId) {
    return isJson
      ? NextResponse.json({ error: "leadId is required" }, { status: 400 })
      : NextResponse.redirect(new URL("/commissions", req.url))
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId), isNull(leads.deletedAt)))
    .limit(1)

  if (!lead) {
    return isJson
      ? NextResponse.json({ error: "Lead not found" }, { status: 404 })
      : NextResponse.redirect(new URL("/commissions", req.url))
  }

  const scope = await resolvePartnerScopeForActor({
    tenantId,
    actorUserId: userId,
    member,
  })
  if (!isPartnerReadable(scope, lead.partnerId)) {
    return fail("forbidden_scope", isJson ? 403 : 303)
  }

  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.id, lead.partnerId))
    .limit(1)

  if (!partner) {
    return fail("no_partner", isJson ? 404 : 303)
  }

  if (lead.status !== "deal_won") {
    return fail("not_deal_won", isJson ? 422 : 303)
  }

  if (!recurring) {
    const [existing] = await db
      .select({ id: commissions.id })
      .from(commissions)
      .where(and(eq(commissions.sourceType, "lead"), eq(commissions.sourceId, leadId)))
      .limit(1)

    if (existing) {
      return fail("duplicate", isJson ? 409 : 303)
    }
  }

  const commissionModel = await resolvePartnerCommissionModel(partner)
  if (!commissionModel) {
    return fail("no_model", isJson ? 422 : 303)
  }

  const fromPayment = Number(lead.paymentAmount ?? 0)
  const fromProposal = Number(lead.proposalAmount ?? 0)
  const rawBasis =
    basisAmount != null && Number.isFinite(basisAmount) && basisAmount > 0
      ? basisAmount
      : fromPayment > 0
        ? fromPayment
        : fromProposal > 0
          ? fromProposal
          : 0

  if (!Number.isFinite(rawBasis) || rawBasis <= 0) {
    return fail("no_basis", isJson ? 422 : 303)
  }

  const vatOpts = getCommissionVatOptionsFromEnv()
  const basis = deriveNetCommissionBaseFromCrm(rawBasis, vatOpts)
  const conversions = await countPartnerDealWonLeads(partner.id)

  const commissionResult = calculateCommission({
    model: commissionModel,
    serviceFee: basis.netForCommission,
    partnerConversionsThisPeriod: conversions,
    partnerLifetimeConversions: conversions,
  })

  if (commissionResult.amount <= 0) {
    return fail("zero_commission", isJson ? 422 : 303)
  }

  const calculationSnapshot = {
    version: 2,
    source: recurring ? "manual_recurring_from_lead" : "manual_deal_close_from_lead",
    leadId,
    grossFromLead: rawBasis,
    netForCommission: basis.netForCommission,
    vatRatePct: basis.vatRatePct,
    crmAmountIncludesVatApplied: basis.crmAmountIncludesVat,
  }

  const sourceType = recurring ? "lead_recurring_invoice" : "lead"
  const sourceId = recurring ? randomUUID() : leadId

  let created: typeof commissions.$inferSelect | undefined
  try {
    ;[created] = await db
      .insert(commissions)
      .values({
        tenantId,
        partnerId: partner.id,
        sourceType,
        sourceId,
        relatedLeadId: leadId,
        amount: String(commissionResult.amount),
        currency: "AED",
        status: "pending",
        breakdown: `${basis.summaryLine}. ${commissionResult.breakdown}`,
        calculationSnapshot,
        calculatedAt: new Date(),
      })
      .returning()
  } catch (e) {
    console.error("[POST /api/admin/commissions/from-lead]", e)
    return fail("server", isJson ? 500 : 303)
  }

  if (!created) {
    return fail("server", isJson ? 500 : 303)
  }

  await logActivity({
    tenantId,
    entityType: "commission",
    entityId: created.id,
    actorId: userId,
    actorName,
    action: "created",
    note: `${recurring ? "Recurring" : "Deal-close"} commission created manually from lead.`,
    metadata: {
      leadId,
      sourceType,
      basisAmount: rawBasis,
      recurring,
    },
  })

  return ok(created, 201)
}
