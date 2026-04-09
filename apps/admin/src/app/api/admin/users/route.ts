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
import { getAdminPortalUrl, sendTeamMemberInviteEmail } from "@repo/notifications"

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

  // Create Supabase auth account (no Supabase email — we use SendGrid)
  const supabaseAdmin = getSupabaseAdminClient()
  const adminPortalUrl = getAdminPortalUrl()

  let authUserId: string

  // Try to create a new auth user
  const { data: createData, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
    })

  if (createError) {
    // If user already exists in Supabase, find and link them
    if (
      createError.message?.includes("already been registered") ||
      createError.message?.includes("already exists")
    ) {
      // Paginate to handle >50 auth users
      let existingUser: { id: string } | undefined
      let page = 1
      while (!existingUser) {
        const { data: existingUsers } =
          await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 })
        const users = existingUsers?.users ?? []
        if (users.length === 0) break
        existingUser = users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        )
        page++
      }

      if (!existingUser) {
        return NextResponse.json(
          { error: "User exists in auth but could not be found." },
          { status: 500 }
        )
      }

      authUserId = existingUser.id
    } else {
      console.error("[POST /api/admin/users] Supabase create error:", createError)
      return NextResponse.json(
        { error: `Failed to create auth account: ${createError.message}` },
        { status: 500 }
      )
    }
  } else {
    authUserId = createData.user.id
  }

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

  // Generate a recovery link so user can set their password, send via SendGrid
  const roleMeta = getTeamRoleMeta(normalizedRole)
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
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
