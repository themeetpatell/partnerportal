import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { calculateCommission } from "@repo/commission-engine"
import { db, commissionModels, commissions, leads, partners } from "@repo/db"
import { and, eq } from "drizzle-orm"
import { sendLeadStatusEmail } from "@repo/notifications"
import type { CommissionModel } from "@repo/types"
import {
  convertZohoLeadToDeal,
  fetchZohoDeal,
  getZohoDealArAmount,
  fetchZohoLead,
  getZohoDealAmount,
  getZohoDealClosingDate,
  getZohoDealCompanyName,
  getZohoLeadDealId,
  getZohoDealIndustry,
  getZohoDealPaymentId,
  getZohoDealPaymentMethod,
  getZohoDealPaymentRecurring,
  getZohoDealPaymentStatus,
  getZohoDealProposal,
  getZohoDealServicePeriodEnd,
  getZohoDealServicePeriodStart,
  getZohoDealServicesList,
  getZohoDealServiceType,
  mapZohoDealStageToLeadStatus,
  mapZohoLeadStatusToLeadStatus,
} from "@repo/zoho"
import { rateLimit } from "@repo/auth"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { hasAnyTeamRole } from "@/lib/rbac"

type AppLeadStatus = "submitted" | "qualified" | "proposal_sent" | "deal_won" | "deal_lost"

function parseStoredStringArray(value: string | null | undefined) {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : []
  } catch {
    return []
  }
}

function getRedirectTarget(request: NextRequest, leadId: string) {
  const url = new URL(request.url)
  return url.searchParams.get("redirectTo") || `/leads/${leadId}`
}

function maybeRedirect(request: NextRequest, leadId: string, searchParams?: URLSearchParams) {
  const accept = request.headers.get("accept") || ""
  const contentType = request.headers.get("content-type") || ""

  if (!accept.includes("text/html") && contentType.includes("application/json")) {
    return null
  }

  const redirectUrl = new URL(getRedirectTarget(request, leadId), request.url)
  if (searchParams) {
    redirectUrl.search = searchParams.toString()
  }
  return NextResponse.redirect(redirectUrl)
}

function buildQualifiedDealName(params: {
  customerName: string
  customerCompany: string | null
  partnerCompany: string
}) {
  return params.customerCompany?.trim()
    ? `${params.customerCompany.trim()}`
    : `${params.customerName} - ${params.partnerCompany}`
}

function getDealClosingDate() {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().slice(0, 10)
}

function parseCommissionRate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.replace(/%/g, "").trim()
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null
  }

  return parsed
}

async function resolvePartnerCommissionModel(
  partner: typeof partners.$inferSelect,
): Promise<CommissionModel | null> {
  if (partner.commissionModelId) {
    const [storedModel] = await db
      .select()
      .from(commissionModels)
      .where(
        and(
          eq(commissionModels.id, partner.commissionModelId),
          eq(commissionModels.tenantId, partner.tenantId),
        ),
      )
      .limit(1)

    if (storedModel) {
      try {
        return {
          id: storedModel.id,
          tenantId: storedModel.tenantId,
          name: storedModel.name,
          type: storedModel.type as CommissionModel["type"],
          config: JSON.parse(storedModel.config),
          isActive: storedModel.isActive,
          createdAt: storedModel.createdAt,
        }
      } catch (error) {
        console.error("[lead sync] Invalid commission model config:", error)
      }
    }
  }

  const commissionRate = parseCommissionRate(partner.commissionRate)
  const commissionType = partner.commissionType?.trim().toLowerCase()
  if (
    commissionRate == null ||
    (commissionType && !["flat", "percentage"].includes(commissionType))
  ) {
    return null
  }

  return {
    id: partner.commissionModelId ?? partner.id,
    tenantId: partner.tenantId,
    name: "Partner Commission",
    type: "flat_pct",
    config: { pct: commissionRate },
    isActive: true,
    createdAt: new Date(),
  }
}

async function ensureLeadCommissionFromDeal(params: {
  lead: typeof leads.$inferSelect
  partner: typeof partners.$inferSelect
  dealId: string
}) {
  const existingCommission = await db
    .select({ id: commissions.id })
    .from(commissions)
    .where(
      and(
        eq(commissions.sourceType, "lead"),
        eq(commissions.sourceId, params.lead.id),
      ),
    )
    .limit(1)

  if (existingCommission.length > 0) {
    return
  }

  const zohoDeal = await fetchZohoDeal(params.dealId)
  if (!zohoDeal) {
    throw new Error("Failed to fetch Zoho deal for commission calculation.")
  }

  const arAmount = getZohoDealArAmount(zohoDeal) ?? 0
  const dealAmount = getZohoDealAmount(zohoDeal) ?? 0
  const commissionBaseAmount = arAmount > 0 ? arAmount : dealAmount
  if (commissionBaseAmount <= 0) {
    throw new Error(
      "AR Amount is missing in Zoho CRM. Please set AR Amount before closing as won.",
    )
  }

  const commissionModel = await resolvePartnerCommissionModel(params.partner)
  if (!commissionModel) {
    return
  }

  const priorConversions = await db
    .select()
    .from(leads)
    .where(eq(leads.partnerId, params.partner.id))

  const priorWon = priorConversions.filter(
    (row) => row.status === "deal_won" && row.id !== params.lead.id,
  ).length

  const commissionResult = calculateCommission({
    model: commissionModel,
    serviceFee: commissionBaseAmount,
    partnerConversionsThisPeriod: priorWon + 1,
    partnerLifetimeConversions: priorWon + 1,
  })

  if (commissionResult.amount <= 0) {
    return
  }

  await db.insert(commissions).values({
    tenantId: params.partner.tenantId,
    partnerId: params.partner.id,
    sourceType: "lead",
    sourceId: params.lead.id,
    amount: String(commissionResult.amount),
    currency: "AED",
    status: "pending",
    breakdown: commissionResult.breakdown,
    calculatedAt: new Date(),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`lead-sync:${userId}`, 10, 60_000)
  if (limited) return limited

  const { id } = await params
  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "partnership_manager", "sdr"])) {
    const redirect = maybeRedirect(req, id, new URLSearchParams({ sync: "error", reason: "forbidden" }))
    if (redirect) return redirect

    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, id))
    .limit(1)

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  if (!lead.zohoLeadId) {
    const redirect = maybeRedirect(req, id, new URLSearchParams({ sync: "error", reason: "missing_zoho_lead" }))
    if (redirect) return redirect

    return NextResponse.json(
      { error: "Lead has no associated Zoho lead" },
      { status: 400 },
    )
  }

  try {
    const [partner, zohoLead] = await Promise.all([
      db
        .select()
        .from(partners)
        .where(eq(partners.id, lead.partnerId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      fetchZohoLead(lead.zohoLeadId),
    ])

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    }

    if (!zohoLead) {
      const redirect = maybeRedirect(req, id, new URLSearchParams({ sync: "error", reason: "lead_fetch_failed" }))
      if (redirect) return redirect

      return NextResponse.json(
        { error: "Could not fetch lead from Zoho CRM" },
        { status: 502 },
      )
    }

    let nextStatus: AppLeadStatus = mapZohoLeadStatusToLeadStatus(zohoLead.Lead_Status)
    let zohoDealId = lead.zohoDealId || getZohoLeadDealId(zohoLead)
    let zohoDeal = null

    if (nextStatus === "qualified" && !zohoDealId) {
      zohoDealId = await convertZohoLeadToDeal({
        leadId: lead.zohoLeadId,
        dealName: buildQualifiedDealName({
          customerName: lead.customerName,
          customerCompany: lead.customerCompany,
          partnerCompany: partner.companyName,
        }),
        closingDate: getDealClosingDate(),
        leadSource: "Partner Portal",
      })

      if (!zohoDealId) {
        const redirect = maybeRedirect(req, id, new URLSearchParams({ sync: "error", reason: "deal_create_failed" }))
        if (redirect) return redirect

        return NextResponse.json(
          { error: "Lead is qualified in Zoho CRM, but the associated deal could not be created." },
          { status: 502 },
        )
      }
    }

    if (zohoDealId) {
      zohoDeal = await fetchZohoDeal(zohoDealId)

      if (!zohoDeal) {
        const redirect = maybeRedirect(req, id, new URLSearchParams({ sync: "error", reason: "deal_fetch_failed" }))
        if (redirect) return redirect

        return NextResponse.json(
          { error: "Could not fetch associated deal from Zoho CRM" },
          { status: 502 },
        )
      }

      nextStatus = mapZohoDealStageToLeadStatus(zohoDeal.Stage)
    }

    const crmServicesList = zohoDeal ? getZohoDealServicesList(zohoDeal) : []
    const crmProposal = zohoDeal ? getZohoDealProposal(zohoDeal) : null
    const crmAmount = zohoDeal ? getZohoDealAmount(zohoDeal) : null
    const crmClosingDate = zohoDeal ? getZohoDealClosingDate(zohoDeal) : null
    const crmArAmount = zohoDeal ? getZohoDealArAmount(zohoDeal) : null
    const crmIndustry = getZohoDealIndustry(zohoDeal, zohoLead)
    const crmPaymentId = zohoDeal ? getZohoDealPaymentId(zohoDeal) : null
    const crmPaymentStatus = zohoDeal ? getZohoDealPaymentStatus(zohoDeal) : null
    const crmPaymentRecurring = zohoDeal ? getZohoDealPaymentRecurring(zohoDeal) : null
    const crmCompanyName = getZohoDealCompanyName(zohoDeal, zohoLead)
    const crmServicePeriodStart = zohoDeal ? getZohoDealServicePeriodStart(zohoDeal) : null
    const crmServicePeriodEnd = zohoDeal ? getZohoDealServicePeriodEnd(zohoDeal) : null
    const crmPaymentMethod = zohoDeal ? getZohoDealPaymentMethod(zohoDeal) : null
    const crmServiceType = zohoDeal ? getZohoDealServiceType(zohoDeal) : null
    const existingCrmServicesList = parseStoredStringArray(lead.crmServicesList)

    const rejectionReason =
      nextStatus === "deal_lost"
        ? zohoDealId
          ? "Closed Lost in Zoho CRM"
          : zohoLead.Lead_Status || "Lost in Zoho CRM"
        : null

    const convertedAt =
      nextStatus === "deal_won"
        ? lead.convertedAt ?? new Date()
        : null

    const updates: Partial<typeof leads.$inferInsert> = {
      status: nextStatus,
      zohoDealId: zohoDealId ?? null,
      crmServicesList: JSON.stringify(crmServicesList.length > 0 ? crmServicesList : existingCrmServicesList),
      crmProposal: crmProposal ?? lead.crmProposal ?? null,
      crmAmount: crmAmount != null ? String(crmAmount) : (lead.crmAmount ?? null),
      crmClosingDate: crmClosingDate ?? lead.crmClosingDate ?? null,
      crmArAmount: crmArAmount != null ? String(crmArAmount) : (lead.crmArAmount ?? null),
      crmIndustry: crmIndustry ?? lead.crmIndustry ?? null,
      crmPaymentId: crmPaymentId ?? lead.crmPaymentId ?? null,
      crmPaymentStatus: crmPaymentStatus ?? lead.crmPaymentStatus ?? null,
      crmPaymentRecurring: crmPaymentRecurring ?? lead.crmPaymentRecurring ?? null,
      crmCompanyName: crmCompanyName ?? lead.crmCompanyName ?? null,
      crmServicePeriodStart: crmServicePeriodStart ?? lead.crmServicePeriodStart ?? null,
      crmServicePeriodEnd: crmServicePeriodEnd ?? lead.crmServicePeriodEnd ?? null,
      crmPaymentMethod: crmPaymentMethod ?? lead.crmPaymentMethod ?? null,
      crmServiceType: crmServiceType ?? lead.crmServiceType ?? null,
      rejectionReason,
      convertedAt,
      updatedAt: new Date(),
    }

    const shouldUpdate =
      lead.status !== updates.status ||
      (lead.zohoDealId ?? null) !== (updates.zohoDealId ?? null) ||
      (lead.crmServicesList ?? "[]") !== (updates.crmServicesList ?? "[]") ||
      (lead.crmProposal ?? null) !== (updates.crmProposal ?? null) ||
      (lead.crmAmount ?? null) !== (updates.crmAmount ?? null) ||
      (lead.crmClosingDate ?? null) !== (updates.crmClosingDate ?? null) ||
      (lead.crmArAmount ?? null) !== (updates.crmArAmount ?? null) ||
      (lead.crmIndustry ?? null) !== (updates.crmIndustry ?? null) ||
      (lead.crmPaymentId ?? null) !== (updates.crmPaymentId ?? null) ||
      (lead.crmPaymentStatus ?? null) !== (updates.crmPaymentStatus ?? null) ||
      (lead.crmPaymentRecurring ?? null) !== (updates.crmPaymentRecurring ?? null) ||
      (lead.crmCompanyName ?? null) !== (updates.crmCompanyName ?? null) ||
      (lead.crmServicePeriodStart ?? null) !== (updates.crmServicePeriodStart ?? null) ||
      (lead.crmServicePeriodEnd ?? null) !== (updates.crmServicePeriodEnd ?? null) ||
      (lead.crmPaymentMethod ?? null) !== (updates.crmPaymentMethod ?? null) ||
      (lead.crmServiceType ?? null) !== (updates.crmServiceType ?? null) ||
      (lead.rejectionReason ?? null) !== (updates.rejectionReason ?? null) ||
      (lead.convertedAt?.toISOString() ?? null) !== (updates.convertedAt?.toISOString() ?? null)

    const [updatedLead] = shouldUpdate
      ? await db
          .update(leads)
          .set(updates)
          .where(eq(leads.id, id))
          .returning()
      : [lead]

    if (updatedLead.status === "deal_won" && zohoDealId) {
      await ensureLeadCommissionFromDeal({
        lead: updatedLead,
        partner,
        dealId: zohoDealId,
      })
    }

    if (updatedLead.status !== lead.status && partner.email) {
      await sendLeadStatusEmail(
        partner.email,
        updatedLead.customerCompany || updatedLead.customerName,
        updatedLead.status,
      )
    }

    const redirect = maybeRedirect(
      req,
      id,
      new URLSearchParams({
        sync: "ok",
        status: updatedLead.status,
      }),
    )

    if (redirect) {
      return redirect
    }

    return NextResponse.json({
      success: true,
      message:
        updatedLead.status === lead.status && updatedLead.zohoDealId === lead.zohoDealId
          ? "Lead is already in sync with Zoho CRM."
          : `Lead synced from Zoho CRM: ${lead.status} → ${updatedLead.status}`,
      lead: updatedLead,
    })
  } catch (err) {
    console.error("[lead sync] Error:", err)

    const reason =
      err instanceof Error && err.message.includes("Deal amount is missing")
        ? "missing_deal_amount"
        : "unexpected"

    const redirect = maybeRedirect(req, id, new URLSearchParams({ sync: "error", reason }))
    if (redirect) return redirect

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync lead status from Zoho" },
      { status: 500 },
    )
  }
}
