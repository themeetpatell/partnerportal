import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, partners, logActivity } from "@repo/db"
import { rateLimit } from "@repo/auth"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole } from "@/lib/rbac"

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-partners:create:${userId}`, 20, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)
  const tenantId = getRequiredTenantId()

  // Only admin or partnership roles may create partners
  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "partnership_manager"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

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

  if (!companyName || !contactName || !email || !type) {
    return NextResponse.json(
      { error: "companyName, contactName, email, type are required" },
      { status: 400 }
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
      email,
      phone: phone || null,
      type,
      tier: tier || null,
      region: region || null,
      country: country || null,
      city: city || null,
      channel: channel || null,
      ownerId: ownerId || null,
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
