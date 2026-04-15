import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { EmailOtpType } from "@supabase/supabase-js"

const ALLOWED_EMAIL_OTP_TYPES = new Set<EmailOtpType>(["email", "recovery", "invite", "email_change"])

function getSafeNextPath(candidate: FormDataEntryValue | null, fallback: string) {
  if (typeof candidate !== "string" || !candidate.startsWith("/")) {
    return fallback
  }

  return candidate
}

function jsonRedirect(url: URL, error?: string) {
  return NextResponse.json(
    {
      redirectTo: `${url.pathname}${url.search}`,
      ...(error ? { error } : {}),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const formData = await request.formData()
  const tokenHash = formData.get("token_hash")
  const type = formData.get("type")
  const nextPath = getSafeNextPath(formData.get("next"), "/reset-password")

  if (
    typeof tokenHash !== "string" ||
    typeof type !== "string" ||
    !ALLOWED_EMAIL_OTP_TYPES.has(type as EmailOtpType)
  ) {
    return jsonRedirect(
      new URL("/sign-in?auth_error=Invalid+or+expired+verification+link.", url.origin),
      "Invalid or expired verification link.",
    )
  }

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
    type: type as EmailOtpType,
  })

  if (error) {
    console.error("[admin auth verify] verifyOtp failed", {
      message: error.message,
      status: error.status,
      type,
    })
    const signInUrl = new URL("/sign-in", url.origin)
    signInUrl.searchParams.set("auth_error", "Invalid or expired verification link.")
    return jsonRedirect(signInUrl, "Invalid or expired verification link.")
  }

  return jsonRedirect(new URL(nextPath, url.origin))
}
