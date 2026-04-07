import { cache } from "react"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getOptionalSupabaseAuthEnv, mapSupabaseUser } from "./shared"

export async function createAuthServerClient() {
  const cookieStore = await cookies()
  const env = getOptionalSupabaseAuthEnv()

  if (!env) {
    return null
  }

  return createServerClient(env.url, env.publishableKey, {
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

export const currentUser = cache(async function currentUser() {
  const supabase = await createAuthServerClient()
  if (!supabase) {
    return null
  }

  // Use getSession() instead of getUser() to avoid a network round-trip.
  // Middleware already validates the token via getUser() on every request,
  // so the session cookie is guaranteed fresh by the time we reach here.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return mapSupabaseUser(session?.user ?? null)
})

export async function auth() {
  const user = await currentUser()

  return {
    userId: user?.id ?? null,
  }
}
