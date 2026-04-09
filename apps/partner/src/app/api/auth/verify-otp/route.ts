import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { rateLimit, getClientIp, verifyOtp } from "@repo/auth"
import { getSupabaseAdminClient } from "@repo/auth/admin"
import { sendPartnerWelcomeEmail } from "@repo/notifications"

export async function POST(request: NextRequest) {
  const ipLimited = rateLimit(`verify-otp:${getClientIp(request.headers)}`, 5, 60_000)
  if (ipLimited) return ipLimited

  const body = await request.json().catch(() => null)
  const code = typeof body?.code === "string" ? body.code.trim() : ""
  const challenge = typeof body?.challenge === "string" ? body.challenge.trim() : ""

  if (!code || !challenge) {
    return NextResponse.json(
      { error: "Code and challenge are required" },
      { status: 400 }
    )
  }

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Code must be a 6-digit number", reason: "invalid" },
      { status: 400 }
    )
  }

  // Per-challenge rate limit: 5 attempts per challenge token (prevents brute force on a single OTP)
  const challengeHash = createHash("sha256").update(challenge).digest("hex").slice(0, 16)
  const challengeLimited = rateLimit(`verify-otp-ch:${challengeHash}`, 5, 600_000)
  if (challengeLimited) return challengeLimited

  const result = verifyOtp(code, challenge)

  if (!result.valid || !result.email) {
    const status = result.error === "expired" ? 410 : 400
    return NextResponse.json(
      { error: result.error === "expired" ? "Code has expired" : "Incorrect code", reason: result.error },
      { status }
    )
  }

  try {
    const admin = getSupabaseAdminClient()

    // Find user by email and confirm
    let userId: string | undefined
    let partnerName = "Partner"
    let page = 1
    while (!userId) {
      const { data: usersData } = await admin.auth.admin.listUsers({ page, perPage: 100 })
      const users = usersData?.users ?? []
      if (users.length === 0) break
      const user = users.find((u) => u.email?.toLowerCase() === result.email)
      if (user) {
        userId = user.id
        const meta = user.user_metadata ?? {}
        partnerName =
          [meta.first_name, meta.last_name].filter(Boolean).join(" ") || "Partner"
      }
      page++
    }

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await admin.auth.admin.updateUserById(userId, { email_confirm: true })

    // Send welcome email (non-blocking for the response)
    sendPartnerWelcomeEmail(result.email, partnerName).catch((err) => {
      console.error("[verify-otp] Welcome email failed:", err)
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/auth/verify-otp] Error:", err)
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    )
  }
}
