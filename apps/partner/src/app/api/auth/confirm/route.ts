import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { rateLimit, getClientIp } from "@repo/auth"

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

  // Find the user by email
  const { data: usersData } = await admin.auth.admin.listUsers()
  const user = usersData?.users?.find(
    (u) => u.email?.toLowerCase() === email
  )

  if (!user) {
    // Don't reveal whether the user exists
    return NextResponse.json({ ok: true })
  }

  // Auto-confirm the email
  await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })

  return NextResponse.json({ ok: true })
}
