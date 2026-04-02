import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { calculateCommission } from "@repo/commission-engine"
import { db, commissions, leads, partners } from "@repo/db"
import { and, eq } from "drizzle-orm"
import { sendLeadStatusEmail } from "@repo/notifications"
import {
  convertZohoLeadToDeal,
  fetchZohoDeal,
  fetchZohoLead,
  getZohoDealAmount,
  getZohoLeadDealId,
  mapZohoDealStageToLeadStatus,
  mapZohoLeadStatusToLeadStatus,
} from "@repo/zoho"
import { rateLimit } from "@repo/auth"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { hasAnyTeamRole } from "@/lib/rbac"

type AppLeadStatus = "submitted" | "qualified" | "proposal_sent" | "deal_won" | "deal_lost"

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

  const dealAmount = getZohoDealAmount(zohoDeal)
  if (dealAmount <= 0) {
    throw new Error(
      "Deal amount is missing in Zoho CRM. Please set the deal Amount before closing as won.",
    )
  }

  if (!params.partner.commissionModelId) {
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
    model: {
      id: params.partner.commissionModelId,
      tenantId: params.partner.tenantId,
      name: "Partner Commission",
      type: "flat_pct",
      config: { pct: 10 },
      isActive: true,
      createdAt: new Date(),
    },
    serviceFee: dealAmount,
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

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "partnership_manager", "sdr"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

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
      const zohoDeal = await fetchZohoDeal(zohoDealId)

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
      rejectionReason,
      convertedAt,
      updatedAt: new Date(),
    }

    const shouldUpdate =
      lead.status !== updates.status ||
      (lead.zohoDealId ?? null) !== (updates.zohoDealId ?? null) ||
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
