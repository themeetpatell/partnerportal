import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, partners, teamMembers, logActivity } from "@repo/db"
import { and, eq, isNull, sql } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, PARTNER_OPERATIONS_ROLES } from "@/lib/rbac"
import { resolvePartnerScopeForActor } from "@/lib/row-scope"

async function resolveRoundRobinPartnershipExecutiveId(tenantId: string) {
  const executives = await db
    .select({
      id: teamMembers.id,
      createdAt: teamMembers.createdAt,
    })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.tenantId, tenantId),
        eq(teamMembers.isActive, true),
        eq(teamMembers.role, "partnership_executive"),
      ),
    )

  if (executives.length === 0) {
    return null
  }

  const partnerLoadRows = await db
    .select({
      ownerId: partners.ownerId,
      count: sql<number>`count(*)::int`,
    })
    .from(partners)
    .where(and(eq(partners.tenantId, tenantId), isNull(partners.deletedAt)))
    .groupBy(partners.ownerId)

  const loadByOwnerId = new Map<string, number>(
    partnerLoadRows
      .filter((row): row is { ownerId: string; count: number } => Boolean(row.ownerId))
      .map((row) => [row.ownerId, Number(row.count) || 0]),
  )

  const sorted = [...executives].sort((a, b) => {
    const loadA = loadByOwnerId.get(a.id) ?? 0
    const loadB = loadByOwnerId.get(b.id) ?? 0
    if (loadA !== loadB) return loadA - loadB
    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  return sorted[0]?.id ?? null
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-partners:create:${userId}`, 20, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)
  const tenantId = getRequiredTenantId()

  // Only admin or partnership roles may create partners
  if (!member || !hasAnyTeamRole(member.role, PARTNER_OPERATIONS_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const scope = await resolvePartnerScopeForActor({
    tenantId,
    actorUserId: userId,
    member,
  })

  const body = await req.json()
  const {
    companyName,
    contactName,
    email,
    phone,
    type,
    tier,
    region,
    country,
    city,
    channel,
    ownerId,
    agreementUrl,
    commissionModelId,
    status = "draft",
  } = body

  const roundRobinOwnerId =
    scope.kind === "restricted" ? null : await resolveRoundRobinPartnershipExecutiveId(tenantId)

  const resolvedOwnerId =
    scope.kind === "restricted" ? member.id : ownerId ? String(ownerId) : null
  const finalOwnerId = resolvedOwnerId ?? roundRobinOwnerId

  if (!companyName || !contactName || !email || !type) {
    return NextResponse.json(
      { error: "companyName, contactName, email, type are required" },
      { status: 400 }
    )
  }

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""

  if (!normalizedEmail) {
    return NextResponse.json({ error: "email is required" }, { status: 400 })
  }

  // Duplicate email check — prevent two active partner records for the same email
  const [existingPartner] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(and(
      eq(partners.email, normalizedEmail),
      eq(partners.tenantId, tenantId),
      isNull(partners.deletedAt)
    ))
    .limit(1)

  if (existingPartner) {
    return NextResponse.json(
      { error: "A partner with this email already exists", duplicateId: existingPartner.id },
      { status: 409 }
    )
  }

  // Generate a placeholder authUserId for manually-created partners (no auth account yet)
  const placeholderAuthUserId = `manual_${crypto.randomUUID()}`

  const [created] = await db
    .insert(partners)
    .values({
      tenantId,
      authUserId: placeholderAuthUserId,
      companyName,
      contactName,
      email: normalizedEmail,
      phone: phone || null,
      type,
      tier: tier || null,
      region: region || null,
      country: country || null,
      city: city || null,
      channel: channel || null,
      ownerId: finalOwnerId,
      agreementUrl: agreementUrl || null,
      commissionModelId: commissionModelId || null,
      status,
    })
    .returning()

  await logActivity({
    tenantId,
    entityType: "partner",
    entityId: created!.id,
    actorId: userId,
    actorName,
    action: "created",
    note: `Partner profile created manually by ${actorName}. Status: ${status}`,
  })

  return NextResponse.json(created, { status: 201 })
}
