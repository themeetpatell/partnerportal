import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
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

  try {
    await sendPartnerWelcomeEmail(email, fullName)
    return NextResponse.json({ ok: true, debug: "email_sent", to: email, name: fullName })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error("[POST /api/auth/confirm] Welcome email failed:", err)
    return NextResponse.json({ ok: false, debug: "email_failed", error: errMsg })
  }
}
