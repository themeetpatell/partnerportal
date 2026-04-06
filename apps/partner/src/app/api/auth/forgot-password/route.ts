import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@repo/auth/admin"
import { rateLimit, getClientIp } from "@repo/auth"
import { db, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import { sendPartnerPasswordResetEmail } from "@repo/notifications"

export async function POST(request: NextRequest) {
  const limited = rateLimit(`forgot-password:${getClientIp(request.headers)}`, 3, 60_000)
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  // Always return success to avoid email enumeration
  const ok = NextResponse.json({ ok: true })

  try {
    const supabaseAdmin = getSupabaseAdminClient()
    const partnerPortalUrl =
      process.env.NEXT_PUBLIC_PARTNER_APP_URL?.trim() || "http://localhost:3000"

    // Generate a recovery link server-side so we control the email
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${partnerPortalUrl}/auth/callback` },
      })

    if (linkError || !linkData?.properties?.action_link) {
      // User may not exist — return ok anyway
      return ok
    }

    // Look up the partner name for the email template
    const [partner] = await db
      .select({ contactName: partners.contactName })
      .from(partners)
      .where(eq(partners.email, email))
      .limit(1)

    const partnerName = partner?.contactName || "Partner"

    await sendPartnerPasswordResetEmail(
      email,
      partnerName,
      linkData.properties.action_link
    )
  } catch (err) {
    console.error("[POST /api/auth/forgot-password] Error:", err)
  }

  return ok
}
