import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import sgMail from "@sendgrid/mail"
import { rateLimit, getClientIp } from "@repo/auth"
import { sendPartnerWelcomeEmail } from "@repo/notifications"

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(`auth-confirm:${getClientIp(request.headers)}`, 5, 60_000)
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Find the user by email — paginate to handle >50 auth users
  let user: { id: string; user_metadata?: Record<string, string> } | undefined
  let page = 1
  while (!user) {
    const { data: usersData } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    })
    const users = usersData?.users ?? []
    if (users.length === 0) break
    user = users.find((u) => u.email?.toLowerCase() === email)
    page++
  }

  if (!user) {
    return NextResponse.json({ ok: true, debug: "user_not_found", pagesSearched: page - 1 })
  }

  // Auto-confirm the email
  await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })

  // Send welcome email — MUST await so the serverless function stays alive
  const fullName =
    [user.user_metadata?.first_name, user.user_metadata?.last_name]
      .filter(Boolean)
      .join(" ") || "Partner"

  // Diagnostic: test both direct sgMail and notifications package
  const diagKey = process.env.SENDGRID_API_KEY?.trim()
  const diagFrom = process.env.SENDGRID_FROM_EMAIL?.trim() || "meet@finanshels.com"

  if (!diagKey) {
    return NextResponse.json({ ok: false, debug: "NO_SENDGRID_API_KEY_IN_ENV" })
  }

  // Send via direct sgMail (same approach as test-email endpoint that works)
  sgMail.setApiKey(diagKey)
  try {
    const [sgResponse] = await sgMail.send({
      to: email,
      from: { email: diagFrom, name: "Finanshels" },
      subject: "Welcome to the Finanshels Partner Portal",
      html: `<p>Hi ${fullName}, your account has been confirmed. Sign in at <a href="https://partner.finanshels.com/sign-in">partner.finanshels.com</a>.</p>`,
    })
    return NextResponse.json({
      ok: true,
      debug: "direct_sgmail_sent",
      statusCode: sgResponse.statusCode,
      to: email,
      from: diagFrom,
      name: fullName,
    })
  } catch (err: unknown) {
    const sgErr = err as { response?: { statusCode?: number; body?: unknown }; message?: string }
    return NextResponse.json({
      ok: false,
      debug: "direct_sgmail_failed",
      statusCode: sgErr.response?.statusCode,
      body: sgErr.response?.body,
      message: sgErr.message,
    })
  }
}
