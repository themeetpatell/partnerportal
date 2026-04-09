import { NextResponse, type NextRequest } from "next/server"
import { PUBLIC_PARTNER_ROUTES } from "@repo/auth/public-routes"
import { createRouteMatcher, updateSession } from "@repo/auth/middleware"

const isPublicRoute = createRouteMatcher(PUBLIC_PARTNER_ROUTES)
const ADMIN_PORTAL_FALLBACK_URL = "https://finanshels-admin.vercel.app"

function getAdminPortalUrl() {
  return process.env.NEXT_PUBLIC_ADMIN_APP_URL?.trim() || ADMIN_PORTAL_FALLBACK_URL
}

export default async function middleware(req: NextRequest) {
  if (req.nextUrl.hostname === "collab.finanshels.com") {
    const redirectUrl = new URL(req.nextUrl.pathname, getAdminPortalUrl())
    redirectUrl.search = req.nextUrl.search
    return NextResponse.redirect(redirectUrl, 307)
  }

  // Handle Supabase auth error redirects (e.g. expired email verification links).
  // Supabase redirects to the Site URL root with error query params on failure.
  const authErrorCode = req.nextUrl.searchParams.get("error_code")
  if (authErrorCode && req.nextUrl.pathname === "/") {
    const signInUrl = new URL("/sign-in", req.url)
    if (authErrorCode === "otp_expired") {
      signInUrl.searchParams.set("auth_error", "Your verification link has expired. Please sign in or request a new one.")
    } else {
      const desc = req.nextUrl.searchParams.get("error_description")?.replace(/\+/g, " ")
      signInUrl.searchParams.set("auth_error", desc || "Authentication failed. Please try again.")
    }
    return NextResponse.redirect(signInUrl)
  }

  const { response, user } = await updateSession(req)
  const pathname = req.nextUrl.pathname

  if (!isPublicRoute(req) && !user) {
    const redirectUrl = new URL("/sign-in", req.url)
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (
    user &&
    (pathname.startsWith("/sign-in") ||
      pathname.startsWith("/sign-up") ||
      pathname.startsWith("/register"))
  ) {
    const continueUrl = new URL("/auth/continue", req.url)
    const next = req.nextUrl.searchParams.get("next")
    if (next?.startsWith("/")) {
      continueUrl.searchParams.set("next", next)
    }
    return NextResponse.redirect(continueUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
