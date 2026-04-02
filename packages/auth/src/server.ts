import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseAuthEnv, mapSupabaseUser } from "./shared"

export async function createAuthServerClient() {
  const { url, publishableKey } = getSupabaseAuthEnv()
  const cookieStore = await cookies()

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {}
      },
    },
  })
}

export async function currentUser() {
  const supabase = await createAuthServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return mapSupabaseUser(user)
}

export async function auth() {
  const user = await currentUser()

  return {
    userId: user?.id ?? null,
  }
}
