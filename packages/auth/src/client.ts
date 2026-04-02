"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"
import { getSupabaseAuthEnv, mapSupabaseUser, type AppAuthUser } from "./shared"

let browserClient:
  | ReturnType<typeof createBrowserClient>
  | undefined

export function getAuthBrowserClient() {
  if (!browserClient) {
    const { url, publishableKey } = getSupabaseAuthEnv()
    browserClient = createBrowserClient(url, publishableKey)
  }

  return browserClient
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

export function useAuthUser() {
  const [user, setUser] = useState<AppAuthUser | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const client = getAuthBrowserClient()
    let active = true

    async function load() {
      const { data } = await client.auth.getUser()
      if (!active) {
        return
      }

      setUser(mapSupabaseUser(data.user))
      setIsLoaded(true)
    }

    load().catch(() => {
      if (!active) {
        return
      }

      setUser(null)
      setIsLoaded(true)
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!active) {
          return
        }

        setUser(mapSupabaseUser(session?.user ?? null))
        setIsLoaded(true)
      },
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, isLoaded }
}

export function useUser() {
  return useAuthUser()
}

export function useAuth() {
  const { user, isLoaded } = useAuthUser()

  return {
    userId: user?.id ?? null,
    isLoaded,
  }
}

export function useAuthClient() {
  return {
    async signOut({ redirectUrl }: { redirectUrl?: string } = {}) {
      const client = getAuthBrowserClient()
      await client.auth.signOut()

      if (redirectUrl) {
        window.location.assign(redirectUrl)
      }
    },
  }
}

export async function signOut(options?: { redirectUrl?: string }) {
  const client = getAuthBrowserClient()
  await client.auth.signOut()

  if (options?.redirectUrl) {
    window.location.assign(options.redirectUrl)
  }
}
