import { NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { getSupabaseAdminClient } from "@repo/auth/admin"
import { rateLimit } from "@repo/auth"
import {
  buildPortalUrl,
  buildSupabaseVerificationUrl,
  sendTeamMemberPasswordResetEmail,
} from "@repo/notifications"
import { getActiveTeamMember } from "@/lib/admin-auth"

export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`admin-profile:reset-password:${userId}`, 3, 60_000)
  if (limited) return limited

  const member = await getActiveTeamMember(userId)
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabaseAdmin = getSupabaseAdminClient()
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: member.email,
    options: { redirectTo: buildPortalUrl("admin", "/reset-password") },
  })

  if (linkError) {
    console.error("[POST /api/admin/profile/reset-password] Error:", linkError)
    return NextResponse.json(
      { error: `Failed to generate reset link: ${linkError.message}` },
      { status: 500 },
    )
  }

  if (linkData?.properties?.action_link) {
    const resetUrl = buildSupabaseVerificationUrl("admin", "/reset-password", linkData.properties)
    await sendTeamMemberPasswordResetEmail(member.email, member.name, resetUrl)
  }

  return NextResponse.json({ success: true })
}