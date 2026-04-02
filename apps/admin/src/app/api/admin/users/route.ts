import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, teamMembers, logActivity } from "@repo/db"
import { eq } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import {
  TEAM_ROLE_OPTIONS,
  USER_MANAGEMENT_ROLES,
  getDefaultPermissionsForRole,
  hasAnyTeamRole,
  normalizeTeamRole,
} from "@/lib/rbac"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const caller = await getActiveTeamMember(userId)
  if (!caller || !hasAnyTeamRole(caller.role, USER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()
  const rows = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.tenantId, tenantId))
    .orderBy(teamMembers.createdAt)

  return NextResponse.json(
    rows,
    {
      headers: {
        "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60",
      },
    }
  )
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-users:create:${userId}`, 10, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const caller = await getActiveTeamMember(userId)
  const tenantId = getRequiredTenantId()

  // Only admin can create users
  if (!caller || !hasAnyTeamRole(caller.role, USER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, phone, designation, role, rowScope = "all", permissions } = body

  if (!name || !email || !role) {
    return NextResponse.json(
      { error: "name, email, role are required" },
      { status: 400 }
    )
  }

  const normalizedRole = normalizeTeamRole(role)
  if (!normalizedRole) {
    return NextResponse.json(
      {
        error: `Invalid role. Must be one of: ${TEAM_ROLE_OPTIONS.map((item) => item.value).join(", ")}`,
      },
      { status: 400 },
    )
  }

  // Use provided permissions or default to role matrix
  const resolvedPermissions =
    permissions ?? getDefaultPermissionsForRole(normalizedRole) ?? {}
  const placeholderAuthUserId = `manual_${crypto.randomUUID()}`

  const [created] = await db
    .insert(teamMembers)
    .values({
      tenantId,
      authUserId: placeholderAuthUserId,
      name,
      email,
      phone: phone || null,
      designation: designation || null,
      role: normalizedRole,
      rowScope,
      permissions: JSON.stringify(resolvedPermissions),
      isActive: true,
    })
    .returning()

  await logActivity({
    tenantId,
    entityType: "team_member",
    entityId: created!.id,
    actorId: userId,
    actorName,
    action: "created",
    note: `User ${name} (${role}) created by ${actorName}`,
    metadata: {
      designation: designation || null,
      phone: phone || null,
      identitySource: "manual",
    },
  })

  return NextResponse.json(created, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-users:update:${userId}`, 20, 60_000)
  if (limited) return limited

  const caller = await getActiveTeamMember(userId)

  if (!caller || !hasAnyTeamRole(caller.role, USER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const body = await req.json()
  const { role, rowScope, permissions, isActive } = body

  const updates: Partial<typeof teamMembers.$inferInsert> = {}
  if (role !== undefined) {
    const normalizedRole = normalizeTeamRole(role)
    if (!normalizedRole) {
      return NextResponse.json(
        {
          error: `Invalid role. Must be one of: ${TEAM_ROLE_OPTIONS.map((item) => item.value).join(", ")}`,
        },
        { status: 400 },
      )
    }

    updates.role = normalizedRole
  }
  if (rowScope !== undefined) updates.rowScope = rowScope
  if (permissions !== undefined) updates.permissions = JSON.stringify(permissions)
  if (isActive !== undefined) updates.isActive = isActive

  const [updated] = await db
    .update(teamMembers)
    .set(updates)
    .where(eq(teamMembers.id, id))
    .returning()

  return NextResponse.json(updated)
}
