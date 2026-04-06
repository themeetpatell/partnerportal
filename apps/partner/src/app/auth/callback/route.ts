import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If this is a password recovery session, redirect to reset-password page
      if (data.session?.user?.recovery_sent_at) {
        const recoveryTs = new Date(data.session.user.recovery_sent_at).getTime()
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
        if (recoveryTs > fiveMinutesAgo) {
          return NextResponse.redirect(new URL("/reset-password", origin))
        }
      }
      return NextResponse.redirect(new URL("/auth/continue", origin))
    }
  }

  return NextResponse.redirect(new URL("/sign-in?error=confirmation_failed", origin))
}
