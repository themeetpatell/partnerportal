import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { getSupabaseAdminClient } from "@repo/auth/admin"
import { db, teamMembers } from "@repo/db"
import { and, eq } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { USER_MANAGEMENT_ROLES, getTeamRoleMeta, hasAnyTeamRole } from "@/lib/rbac"
import { sendTeamMemberInviteEmail } from "@repo/notifications"

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`admin-users:invite:${userId}`, 10, 60_000)
  if (limited) return limited

  const caller = await getActiveTeamMember(userId)
  if (!caller || !hasAnyTeamRole(caller.role, USER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 })
  }

  const body = await req.json()
  const { memberId } = body

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 })
  }

  const tenantId = getRequiredTenantId()
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.tenantId, tenantId)))
    .limit(1)

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 })
  }

  const supabaseAdmin = getSupabaseAdminClient()
  const adminPortalUrl =
    process.env.NEXT_PUBLIC_ADMIN_APP_URL?.trim() || "http://localhost:3001"

  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: member.email,
      options: { redirectTo: `${adminPortalUrl}/sign-in` },
    })

  if (linkError) {
    console.error("[POST /api/admin/users/resend-invite] Error:", linkError)
    return NextResponse.json(
      { error: `Failed to generate invite link: ${linkError.message}` },
      { status: 500 }
    )
  }

  const roleMeta = getTeamRoleMeta(member.role)
  if (linkData?.properties?.action_link) {
    await sendTeamMemberInviteEmail(
      member.email,
      member.name,
      roleMeta.label,
      linkData.properties.action_link
    )
  }

  return NextResponse.json({ success: true })
}
