import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@repo/auth/server"
import { getSupabaseAdminClient } from "@repo/auth/admin"
import { rateLimit } from "@repo/auth"
import { db, logActivity, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import {
  buildPortalUrl,
  buildSupabaseVerificationUrl,
  sendPartnerPasswordResetEmail,
} from "@repo/notifications"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { hasAnyTeamRole } from "@/lib/rbac"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`partner:reset-password:${userId}`, 10, 60_000)
  if (limited) {
    return limited
  }

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "partnership_manager"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.id, id))
    .limit(1)

  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 })
  }

  if (!partner.email?.trim()) {
    return NextResponse.json({ error: "Partner email is missing" }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdminClient()
  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: partner.email,
      options: { redirectTo: buildPortalUrl("partner", "/reset-password") },
    })

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[POST /api/partners/[id]/reset-password] Error:", linkError)
    return NextResponse.json(
      { error: `Failed to generate reset link${linkError ? `: ${linkError.message}` : ""}` },
      { status: 500 }
    )
  }

  const resetUrl = buildSupabaseVerificationUrl(
    "partner",
    "/reset-password",
    linkData.properties
  )

  await sendPartnerPasswordResetEmail(
    partner.email,
    partner.contactName || partner.companyName || "Partner",
    resetUrl
  )

  const user = await currentUser()
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Admin"

  await logActivity({
    tenantId: partner.tenantId,
    entityType: "partner",
    entityId: partner.id,
    actorId: userId,
    actorName,
    action: "partner.password_reset.sent",
    note: `Partner password reset email sent to ${partner.email}.`,
  })

  return NextResponse.json({ success: true })
}
