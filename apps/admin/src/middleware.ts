import { NextResponse, type NextRequest } from "next/server"
import { PUBLIC_ADMIN_ROUTES } from "@repo/auth/public-routes"
import { createRouteMatcher, updateSession } from "@repo/auth/middleware"

const isPublicRoute = createRouteMatcher(PUBLIC_ADMIN_ROUTES)

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Admin has no sign-up page — redirect to sign-in
  if (pathname.startsWith("/sign-up")) {
    return NextResponse.redirect(new URL("/sign-in", req.url))
  }

  // Reset password flow never branches on `user` — skip Supabase middleware latency.
  if (isPublicRoute(req) && pathname.startsWith("/reset-password")) {
    return NextResponse.next()
  }

  const { response, user } = await updateSession(req)

  if (!isPublicRoute(req) && !user) {
    const redirectUrl = new URL("/sign-in", req.url)
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|_next/webpack|favicon.ico|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)$).*)",
  ],
}
