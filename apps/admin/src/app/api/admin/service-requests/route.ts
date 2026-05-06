import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, leads, logActivity, partners, services, teamMembers } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, LEAD_PIPELINE_ROLES } from "@/lib/rbac"
import { isPartnerReadable, resolvePartnerScopeForActor } from "@/lib/row-scope"
import { splitCustomerNameForStorage } from "@repo/types"

/**
 * Legacy path name: creates an **existing-client lead** (same pipeline as net-new),
 * not a separate service-request entity.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-service-requests:create:${userId}`, 30, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)
  const tenantId = getRequiredTenantId()

  if (!member || !hasAnyTeamRole(member.role, LEAD_PIPELINE_ROLES)) {
    return NextResponse.json(
      { error: "Forbidden — creating this record requires a pipeline role (same as new leads)." },
      { status: 403 },
    )
  }

  const body = await req.json()
  const {
    partnerId,
    serviceId,
    leadId,
    customerCompany,
    customerContact,
    customerEmail,
    pricing,
    startDate,
    endDate,
    assignedTo,
    notes,
    onBehalfNote,
  } = body

  if (!partnerId || !serviceId || !customerCompany || !customerContact || !customerEmail) {
    return NextResponse.json(
      { error: "partnerId, serviceId, customerCompany, customerContact, customerEmail are required" },
      { status: 400 },
    )
  }

  if (!onBehalfNote?.trim()) {
    return NextResponse.json(
      { error: "onBehalfNote is required when creating on behalf of a partner" },
      { status: 400 },
    )
  }

  const scope = await resolvePartnerScopeForActor({
    tenantId,
    actorUserId: userId,
    member,
  })
  if (!isPartnerReadable(scope, partnerId)) {
    return NextResponse.json(
      { error: "Forbidden — partner is outside your row scope" },
      { status: 403 },
    )
  }

  const [partner] = await db
    .select({
      id: partners.id,
      companyName: partners.companyName,
      contactName: partners.contactName,
      sdrTeamMemberId: partners.sdrTeamMemberId,
      partnershipManagerTeamMemberId: partners.partnershipManagerTeamMemberId,
    })
    .from(partners)
    .where(and(eq(partners.id, partnerId), eq(partners.tenantId, tenantId)))
    .limit(1)

  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 })
  }

  const [svc] = await db
    .select({ name: services.name })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)))
    .limit(1)

  if (!svc) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 })
  }

  let sourceLeadId: string | null = null
  if (leadId && typeof leadId === "string") {
    const [won] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.id, leadId),
          eq(leads.partnerId, partnerId),
          eq(leads.tenantId, tenantId),
          eq(leads.status, "deal_won"),
          isNull(leads.deletedAt),
        ),
      )
      .limit(1)
    if (!won) {
      return NextResponse.json(
        { error: "Linked lead must be deal won for the same partner." },
        { status: 422 },
      )
    }
    sourceLeadId = won.id
  }

  let leadOwnerUserId: string | null = null
  let dealOwnerUserId: string | null = null
  let leadOwnerDisplay: string | null = null
  let dealOwnerDisplay: string | null = null
  if (partner.sdrTeamMemberId) {
    const [sdr] = await db
      .select({ authUserId: teamMembers.authUserId, name: teamMembers.name })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.id, partner.sdrTeamMemberId), eq(teamMembers.tenantId, tenantId)),
      )
      .limit(1)
    if (sdr) {
      leadOwnerUserId = sdr.authUserId
      leadOwnerDisplay = sdr.name
    }
  }
  if (partner.partnershipManagerTeamMemberId) {
    const [pm] = await db
      .select({ authUserId: teamMembers.authUserId, name: teamMembers.name })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.id, partner.partnershipManagerTeamMemberId),
          eq(teamMembers.tenantId, tenantId),
        ),
      )
      .limit(1)
    if (pm) {
      dealOwnerUserId = pm.authUserId
      dealOwnerDisplay = pm.name
    }
  }

  const extraLines: string[] = []
  if (startDate) extraLines.push(`Target start: ${startDate}`)
  if (endDate) extraLines.push(`Target end: ${endDate}`)
  extraLines.push(`On behalf note: ${String(onBehalfNote).trim()}`)
  const combinedNotes = [notes?.trim(), extraLines.join("\n")].filter(Boolean).join("\n\n")

  const { firstName: fnStore, lastName: lnStore } = splitCustomerNameForStorage(
    String(customerContact),
  )

  const [created] = await db
    .insert(leads)
    .values({
      tenantId,
      partnerId,
      customerName: String(customerContact).trim(),
      firstName: fnStore,
      lastName: lnStore,
      customerEmail: String(customerEmail).trim(),
      customerCompany: String(customerCompany).trim() || null,
      serviceInterest: JSON.stringify([svc.name]),
      notes: combinedNotes || null,
      status: "submitted",
      source: "manual",
      channel: "admin_existing_client",
      createdBy: userId,
      intakeType: "existing_lead",
      sourceLeadId,
      proposalAmount: pricing != null && pricing !== "" ? String(pricing) : null,
      assignedTo: assignedTo || null,
      leadOwnerUserId,
      dealOwnerUserId,
      leadOwner: leadOwnerDisplay,
      dealOwner: dealOwnerDisplay,
    })
    .returning()

  await logActivity({
    tenantId,
    entityType: "lead",
    entityId: created!.id,
    actorId: userId,
    actorName,
    action: "created",
    note: `Existing-client lead created by ${actorName} (legacy /api/admin/service-requests).`,
    metadata: { intakeType: "existing_lead", sourceLeadId },
  })

  return NextResponse.json({ id: created!.id }, { status: 201 })
}
