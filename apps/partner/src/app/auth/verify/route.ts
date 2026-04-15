import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { EmailOtpType } from "@supabase/supabase-js"

const ALLOWED_EMAIL_OTP_TYPES = new Set(["email", "recovery", "invite", "email_change"])

function getSafeNextPath(candidate: string | null, fallback: string) {
  if (!candidate || !candidate.startsWith("/")) {
    return fallback
  }

  return candidate
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type")
  const nextPath = getSafeNextPath(url.searchParams.get("next"), "/reset-password")

  if (!tokenHash || !type || !ALLOWED_EMAIL_OTP_TYPES.has(type)) {
    const signInUrl = new URL("/sign-in", url.origin)
    signInUrl.searchParams.set("auth_error", "Invalid or expired verification link.")
    return NextResponse.redirect(signInUrl)
  }

  const otpType = type as EmailOtpType

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: otpType,
  })

  if (error) {
    const signInUrl = new URL("/sign-in", url.origin)
    signInUrl.searchParams.set("auth_error", "Invalid or expired verification link.")
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.redirect(new URL(nextPath, url.origin))
}
