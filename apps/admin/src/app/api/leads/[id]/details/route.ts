import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { rateLimit } from "@repo/auth"
import { db, leads, teamMembers } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { hasAnyTeamRole, LEAD_PIPELINE_ROLES } from "@/lib/rbac"

function toNullableString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseNumericString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const num = Number(trimmed.replace(/,/g, ""))
  return Number.isFinite(num) ? String(num) : null
}

function parseServiceInterestFromForm(formData: FormData, fallbackRaw: string) {
  const selected = formData
    .getAll("serviceInterestMulti")
    .flatMap((entry) => (typeof entry === "string" ? [entry.trim()] : []))
    .filter(Boolean)

  const custom = (formData.get("serviceInterestCustom") as string | null)
    ?.split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean) ?? []

  const combined = [...new Set([...selected, ...custom])]
  if (combined.length > 0) {
    return JSON.stringify(combined)
  }

  return fallbackRaw
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`lead-details:${userId}`, 30, 60_000)
  if (limited) return limited

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, LEAD_PIPELINE_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const formData = await req.formData()
  const body = Object.fromEntries(formData.entries())

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
    .limit(1)

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const hasField = (field: string) => formData.has(field)
  const readStringField = (field: string, fallback: string | null) =>
    hasField(field) ? toNullableString(body[field]) : fallback
  const readOptionalAuthId = (field: string, fallback: string | null) =>
    hasField(field) ? toNullableString(body[field]) : fallback
  const readNumericField = (field: string, fallback: string | null) =>
    hasField(field) ? parseNumericString(body[field]) : fallback

  const country = readStringField("country", lead.country)
  const customerEmail = readStringField("customerEmail", lead.customerEmail)
  if (!customerEmail) {
    return NextResponse.json({ error: "Customer email is required" }, { status: 422 })
  }
  if (hasField("country") && !country) {
    return NextResponse.json({ error: "Country is required" }, { status: 422 })
  }

  const firstName = readStringField("firstName", lead.firstName)
  const lastName = readStringField("lastName", lead.lastName)
  const fallbackName = readStringField("customerName", lead.customerName) ?? lead.customerName
  const customerName = [firstName, lastName].filter(Boolean).join(" ").trim() || fallbackName

  const ownerPickersTouched =
    hasField("leadOwnerUserId") || hasField("dealOwnerUserId")
  const leadOwnerUserIdVal = readOptionalAuthId(
    "leadOwnerUserId",
    lead.leadOwnerUserId ?? null,
  )
  const dealOwnerUserIdVal = readOptionalAuthId(
    "dealOwnerUserId",
    lead.dealOwnerUserId ?? null,
  )

  if (ownerPickersTouched && (!leadOwnerUserIdVal || !dealOwnerUserIdVal)) {
    return NextResponse.json(
      { error: "Lead owner and deal owner must both be selected." },
      { status: 422 },
    )
  }

  let leadOwnerDisplay = readStringField("leadOwner", lead.leadOwner)
  let dealOwnerDisplay = readStringField("dealOwner", lead.dealOwner)
  if (leadOwnerUserIdVal && dealOwnerUserIdVal) {
    const [loRow, ddRow] = await Promise.all([
      db
        .select({ name: teamMembers.name })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.tenantId, lead.tenantId),
            eq(teamMembers.authUserId, leadOwnerUserIdVal),
            eq(teamMembers.isActive, true),
          ),
        )
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select({ name: teamMembers.name })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.tenantId, lead.tenantId),
            eq(teamMembers.authUserId, dealOwnerUserIdVal),
            eq(teamMembers.isActive, true),
          ),
        )
        .limit(1)
        .then((r) => r[0] ?? null),
    ])
    if (loRow?.name) {
      leadOwnerDisplay = loRow.name
    }
    if (ddRow?.name) {
      dealOwnerDisplay = ddRow.name
    }
  }

  const now = new Date()
  const [updatedLead] = await db
    .update(leads)
    .set({
      customerName,
      firstName,
      lastName,
      customerEmail,
      customerPhone: readStringField("customerPhone", lead.customerPhone),
      customerCompany: readStringField("customerCompany", lead.customerCompany),
      source: readStringField("source", lead.source),
      channel: readStringField("channel", lead.channel),
      country,
      city: readStringField("city", lead.city),
      serviceInterest:
        hasField("serviceInterestMulti") || hasField("serviceInterestCustom")
          ? parseServiceInterestFromForm(formData, lead.serviceInterest)
          : lead.serviceInterest,
      leadOwnerUserId: leadOwnerUserIdVal,
      dealOwnerUserId: dealOwnerUserIdVal,
      leadOwner: leadOwnerDisplay,
      dealOwner: dealOwnerDisplay,
      partnershipManager: readStringField("partnershipManager", lead.partnershipManager),
      appointmentSetter: readStringField("appointmentSetter", lead.appointmentSetter),
      industry: readStringField("industry", lead.industry),
      businessInUae: readStringField("businessInUae", lead.businessInUae),
      transactionBand: readStringField("transactionBand", lead.transactionBand),
      businessArBand: readStringField("businessArBand", lead.businessArBand),
      decisionRole: readStringField("decisionRole", lead.decisionRole),
      urgencyTimeline: readStringField("urgencyTimeline", lead.urgencyTimeline),
      budgetAmount: readNumericField("budgetAmount", lead.budgetAmount),
      notes: readStringField("notes", lead.notes),
      proposalSummary: readStringField("proposalSummary", lead.proposalSummary),
      proposalAmount: readNumericField("proposalAmount", lead.proposalAmount),
      paymentStatus: readStringField("paymentStatus", lead.paymentStatus),
      paymentReference: readStringField("paymentReference", lead.paymentReference),
      paymentAmount: readNumericField("paymentAmount", lead.paymentAmount),
      stageNotes: readStringField("stageNotes", lead.stageNotes),
      lostReason: readStringField("lostReason", lead.lostReason),
      rejectionReason: hasField("lostReason")
        ? toNullableString(body.lostReason)
        : readStringField("rejectionReason", lead.rejectionReason),
      updatedAt: now,
    })
    .where(eq(leads.id, id))
    .returning()

  const redirectTo = new URL(req.url).searchParams.get("redirectTo") || `/leads/${id}`
  const redirectUrl = new URL(redirectTo, req.url)
  redirectUrl.searchParams.set("save", "ok")

  if ((req.headers.get("accept") || "").includes("text/html")) {
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.json({ success: true, lead: updatedLead })
}
