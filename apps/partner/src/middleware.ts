import { NextResponse, type NextRequest } from "next/server"
import { PUBLIC_PARTNER_ROUTES } from "@repo/auth"
import { createRouteMatcher, updateSession } from "@repo/auth/middleware"

const isPublicRoute = createRouteMatcher(PUBLIC_PARTNER_ROUTES)

export default async function middleware(req: NextRequest) {
  const { response, user } = await updateSession(req)
  const pathname = req.nextUrl.pathname

  if (!isPublicRoute(req) && !user) {
    const redirectUrl = new URL("/sign-in", req.url)
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
