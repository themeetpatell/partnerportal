import { NextResponse, type NextRequest } from "next/server"
import { PUBLIC_ADMIN_ROUTES } from "@repo/auth"
import { createRouteMatcher, updateSession } from "@repo/auth/middleware"

const isPublicRoute = createRouteMatcher(PUBLIC_ADMIN_ROUTES)

export default async function middleware(req: NextRequest) {
  // Admin has no sign-up page — redirect to sign-in
  if (req.nextUrl.pathname.startsWith("/sign-up")) {
    return NextResponse.redirect(new URL("/sign-in", req.url))
  }

  const { response, user } = await updateSession(req)
  const pathname = req.nextUrl.pathname

  if (!isPublicRoute(req) && !user) {
    const redirectUrl = new URL("/sign-in", req.url)
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && pathname.startsWith("/sign-in")) {
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
