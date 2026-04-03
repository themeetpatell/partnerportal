import { NextResponse, type NextRequest } from "next/server"
import { PUBLIC_PARTNER_ROUTES } from "@repo/auth"
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
