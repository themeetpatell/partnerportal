import { NextResponse } from "next/server"
import { auth, currentUser } from "@repo/auth/server"
import { getSupabaseAdminClient } from "@repo/auth/admin"
import { rateLimit } from "@repo/auth"
import { logActivity } from "@repo/db"
import {
  buildPortalUrl,
  buildSupabaseVerificationUrl,
  sendPartnerPasswordResetEmail,
} from "@repo/notifications"
import { getPartnerRecordForAuthenticatedUser } from "@/lib/partner-record"

export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`partner:self-reset-password:${userId}`, 5, 60_000)
  if (limited) {
    return limited
  }

  const user = await currentUser()
  const email = user?.email?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json(
      { error: "No email address is available for this account." },
      { status: 400 }
    )
  }

  const partner = await getPartnerRecordForAuthenticatedUser({
    userId,
    email,
  })

  if (!partner) {
    return NextResponse.json({ error: "Partner record not found." }, { status: 404 })
  }

  const supabaseAdmin = getSupabaseAdminClient()
  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: buildPortalUrl("partner", "/reset-password") },
    })

  if (linkError || !linkData?.properties) {
    console.error("[POST /api/profile/reset-password] Failed to generate reset link:", linkError)
    return NextResponse.json(
      {
        error: `Failed to generate reset link${linkError ? `: ${linkError.message}` : "."}`,
      },
      { status: 500 }
    )
  }

  const resetUrl = buildSupabaseVerificationUrl(
    "partner",
    "/reset-password",
    linkData.properties
  )

  await sendPartnerPasswordResetEmail(
    email,
    partner.contactName || partner.companyName || "Partner",
    resetUrl
  )

  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    partner.contactName ||
    "Partner"

  await logActivity({
    tenantId: partner.tenantId,
    entityType: "partner",
    entityId: partner.id,
    actorId: userId,
    actorName,
    action: "partner.password_reset.requested",
    note: `Partner requested a password reset email to ${email}.`,
    metadata: {
      email,
      requestedAt: new Date().toISOString(),
    },
  })

  return NextResponse.json({ success: true, email })
}
