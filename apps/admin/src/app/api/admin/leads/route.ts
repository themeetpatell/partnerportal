import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, leads, logActivity, partners, services, teamMembers } from "@repo/db"
import { eq, and, or, isNull, inArray } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getActiveTeamMember, getActorName } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, LEAD_PIPELINE_ROLES } from "@/lib/rbac"
import { isPartnerReadable, resolvePartnerScopeForActor } from "@/lib/row-scope"
import { splitCustomerNameForStorage } from "@repo/types"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function resolveServiceInterestNames(tenantId: string, rawValues: unknown) {
  const cleaned = Array.isArray(rawValues)
    ? rawValues
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : []

  const serviceIds = cleaned.filter((value) => uuidPattern.test(value))
  if (serviceIds.length === 0) {
    return [...new Set(cleaned)]
  }

  const rows = await db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(and(eq(services.tenantId, tenantId), inArray(services.id, serviceIds)))

  const serviceNameById = new Map(rows.map((row) => [row.id, row.name]))
  return [
    ...new Set(cleaned.map((value) => serviceNameById.get(value) ?? value)),
  ]
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-leads:create:${userId}`, 30, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)

  if (!member || !hasAnyTeamRole(member.role, LEAD_PIPELINE_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()
  const scope = await resolvePartnerScopeForActor({
    tenantId,
    actorUserId: userId,
    member,
  })

  const body = await req.json()
  const {
    partnerId,
    customerName,
    customerEmail,
    customerPhone,
    customerCompany,
    serviceInterest = [],
    notes,
  } = body

  const source = "partner_portal"

  if (!partnerId || !customerName || !customerEmail) {
    return NextResponse.json(
      { error: "partnerId, customerName, customerEmail are required" },
      { status: 400 }
    )
  }

  // Duplicate check by email or phone within same partner
  const existing = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        eq(leads.partnerId, partnerId),
        eq(leads.tenantId, tenantId),
        isNull(leads.deletedAt),
        or(
          eq(leads.customerEmail, customerEmail),
          customerPhone ? eq(leads.customerPhone, customerPhone) : undefined
        )
      )
    )
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A lead with this email/phone already exists for this partner", duplicateId: existing[0]!.id },
      { status: 409 }
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

  let leadOwnerUserId: string | null = null
  let dealOwnerUserId: string | null = null
  let leadOwnerDisplay: string | null = null
  let dealOwnerDisplay: string | null = null
  if (partner.sdrTeamMemberId) {
    const [sdr] = await db
      .select({ authUserId: teamMembers.authUserId, name: teamMembers.name })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.id, partner.sdrTeamMemberId),
          eq(teamMembers.tenantId, tenantId),
        ),
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

  if (!isPartnerReadable(scope, partnerId)) {
    return NextResponse.json(
      { error: "Forbidden — partner is outside your row scope" },
      { status: 403 },
    )
  }

  const serviceInterestNames = await resolveServiceInterestNames(
    tenantId,
    serviceInterest
  )
  const normalizedNotes = toNullableString(notes)

  const { firstName: fnStore, lastName: lnStore } =
    splitCustomerNameForStorage(String(customerName))

  const [created] = await db
    .insert(leads)
    .values({
      tenantId,
      partnerId,
      customerName,
      firstName: fnStore,
      lastName: lnStore,
      customerEmail,
      customerPhone: customerPhone || null,
      customerCompany: customerCompany || null,
      serviceInterest: JSON.stringify(serviceInterestNames),
      notes: normalizedNotes,
      status: "submitted",
      source,
      channel: source,
      createdBy: userId,
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
    note: `Created by ${actorName} on behalf of partner.`,
    metadata: { source },
  })

  return NextResponse.json(created, { status: 201 })
}
