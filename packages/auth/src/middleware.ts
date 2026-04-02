import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseAuthEnv, mapSupabaseUser } from "./shared"

export function createRouteMatcher(routes: string[]) {
  const patterns = routes.map((route) => new RegExp(`^${route}$`))

  return (req: NextRequest) => {
    return patterns.some((pattern) => pattern.test(req.nextUrl.pathname))
  }
}

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseAuthEnv()
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return {
    response,
    user: mapSupabaseUser(user),
  }
}
