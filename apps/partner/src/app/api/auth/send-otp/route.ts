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

  // Optional sign-up fields (only present on initial sign-up, not resends)
  const password = typeof body?.password === "string" ? body.password : ""
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : ""
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : ""
  const partnerType = typeof body?.partnerType === "string" ? body.partnerType : ""

  try {
    const admin = getSupabaseAdminClient()
    let partnerName = "Partner"

    // If sign-up data provided, ensure the user exists in Supabase
    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        )
      }

      const fullName = [firstName, lastName].filter(Boolean).join(" ")
      partnerName = fullName || "Partner"

      const { error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          partner_type: partnerType,
        },
      })

      if (createError) {
        // "User already registered" is fine — they may be retrying
        const msg = createError.message?.toLowerCase() ?? ""
        if (!msg.includes("already") && !msg.includes("exists")) {
          console.error("[send-otp] createUser error:", createError)
          return NextResponse.json(
            { error: createError.message || "Failed to create account" },
            { status: 400 }
          )
        }
      }
    } else {
      // Resend flow — look up partner name from existing user
      try {
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
    }

    const { code, challenge } = generateOtp(email)
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
