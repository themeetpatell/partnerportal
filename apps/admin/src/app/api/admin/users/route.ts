import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { getSupabaseAdminClient } from "@repo/auth/admin"
import { db, teamMembers, logActivity } from "@repo/db"
import { and, eq } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import {
  TEAM_ROLE_OPTIONS,
  USER_MANAGEMENT_ROLES,
  getDefaultPermissionsForRole,
  getTeamRoleMeta,
  hasAnyTeamRole,
  normalizeTeamRole,
} from "@/lib/rbac"
import { sendTeamMemberInviteEmail } from "@repo/notifications"

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const caller = await getActiveTeamMember(userId)
  if (!caller || !hasAnyTeamRole(caller.role, USER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()
  const url = new URL(req.url)
  const id = url.searchParams.get("id")

  if (id) {
    const [row] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.id, id), eq(teamMembers.tenantId, tenantId)))
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(row)
  }

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

  // Create Supabase auth account and get invite link
  const supabaseAdmin = getSupabaseAdminClient()
  const adminPortalUrl =
    process.env.NEXT_PUBLIC_ADMIN_APP_URL?.trim() || "http://localhost:3001"

  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
      redirectTo: `${adminPortalUrl}/sign-in`,
    })

  if (inviteError) {
    // If user already exists in Supabase, use their existing ID
    if (
      inviteError.message?.includes("already been registered") ||
      inviteError.message?.includes("already exists")
    ) {
      const { data: existingUsers } =
        await supabaseAdmin.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      )

      if (!existingUser) {
        return NextResponse.json(
          { error: "User exists in auth but could not be found." },
          { status: 500 }
        )
      }

      // Generate a password recovery link so they can set a new password
      const { data: linkData } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${adminPortalUrl}/sign-in` },
        })

      const [created] = await db
        .insert(teamMembers)
        .values({
          tenantId,
          authUserId: existingUser.id,
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

      const roleMeta = getTeamRoleMeta(normalizedRole)
      if (linkData?.properties?.action_link) {
        await sendTeamMemberInviteEmail(
          email,
          name,
          roleMeta.label,
          linkData.properties.action_link
        )
      }

      await logActivity({
        tenantId,
        entityType: "team_member",
        entityId: created!.id,
        actorId: userId,
        actorName,
        action: "created",
        note: `User ${name} (${role}) created by ${actorName} — existing auth account linked`,
        metadata: {
          designation: designation || null,
          phone: phone || null,
          identitySource: "supabase_existing",
        },
      })

      return NextResponse.json(created, { status: 201 })
    }

    console.error("[POST /api/admin/users] Supabase invite error:", inviteError)
    return NextResponse.json(
      { error: `Failed to create auth account: ${inviteError.message}` },
      { status: 500 }
    )
  }

  const authUserId = inviteData.user.id

  const [created] = await db
    .insert(teamMembers)
    .values({
      tenantId,
      authUserId,
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

  // Send branded welcome email with the invite link
  const roleMeta = getTeamRoleMeta(normalizedRole)
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${adminPortalUrl}/sign-in` },
  })

  if (linkData?.properties?.action_link) {
    await sendTeamMemberInviteEmail(
      email,
      name,
      roleMeta.label,
      linkData.properties.action_link
    )
  }

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
      identitySource: "supabase",
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
