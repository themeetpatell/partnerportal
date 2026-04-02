export { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
export { currentUser, auth } from "@clerk/nextjs/server"
export { ClerkProvider, useUser, useAuth } from "@clerk/nextjs"
export { rateLimit, getClientIp } from "./rate-limit"

export type TeamRole = "admin" | "sales" | "ops" | "finance"
export type PortalType = "partner" | "admin"

// Role hierarchy for admin portal
export const TEAM_ROLES: TeamRole[] = ["admin", "sales", "ops", "finance"]

// Public routes that don't need auth
export const PUBLIC_PARTNER_ROUTES = [
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/register(.*)",
]

export const PUBLIC_ADMIN_ROUTES = [
  "/sign-in(.*)",
]
