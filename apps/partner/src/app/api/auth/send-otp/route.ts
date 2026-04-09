import { NextRequest, NextResponse } from "next/server"
import { rateLimit, getClientIp, generateOtp } from "@repo/auth"
import { getSupabaseAdminClient } from "@repo/auth/admin"
import { sendOtpEmail } from "@repo/notifications"

export async function POST(request: NextRequest) {
  const ipLimited = rateLimit(`send-otp:${getClientIp(request.headers)}`, 3, 60_000)
  if (ipLimited) return ipLimited

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  // Per-email rate limit: 3 sends per 5 minutes
  const emailLimited = rateLimit(`send-otp-email:${email}`, 3, 300_000)
  if (emailLimited) return emailLimited

  try {
    const { code, challenge } = generateOtp(email)

    // Look up partner name from Supabase user metadata
    let partnerName = "Partner"
    try {
      const admin = getSupabaseAdminClient()
      let page = 1
      let found = false
      while (!found) {
        const { data: usersData } = await admin.auth.admin.listUsers({ page, perPage: 100 })
        const users = usersData?.users ?? []
        if (users.length === 0) break
        const user = users.find((u) => u.email?.toLowerCase() === email)
        if (user) {
          const meta = user.user_metadata ?? {}
          partnerName =
            [meta.first_name, meta.last_name].filter(Boolean).join(" ") || "Partner"
          found = true
        }
        page++
      }
    } catch {
      // Non-critical — fall back to "Partner"
    }

    await sendOtpEmail(email, code, partnerName)

    return NextResponse.json({ ok: true, challenge })
  } catch (err) {
    console.error("[POST /api/auth/send-otp] Error:", err)
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    )
  }
}
