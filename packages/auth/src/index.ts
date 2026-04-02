export { rateLimit, getClientIp } from "./rate-limit"

export type TeamRole = "admin" | "sales" | "ops" | "finance"
export type PortalType = "partner" | "admin"

export const TEAM_ROLES: TeamRole[] = ["admin", "sales", "ops", "finance"]

export const PUBLIC_PARTNER_ROUTES = [
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
]

export const PUBLIC_ADMIN_ROUTES = [
  "/sign-in(.*)",
]
