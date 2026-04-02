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

export async function currentUser() {
  const supabase = await createAuthServerClient()
  if (!supabase) {
    return null
  }

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
