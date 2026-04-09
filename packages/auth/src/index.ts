export { rateLimit, getClientIp } from "./rate-limit"
export { generateOtp, verifyOtp } from "./otp"
export { PUBLIC_ADMIN_ROUTES, PUBLIC_PARTNER_ROUTES } from "./public-routes"

export type TeamRole = "admin" | "sales" | "ops" | "finance"
export type PortalType = "partner" | "admin"

export const TEAM_ROLES: TeamRole[] = ["admin", "sales", "ops", "finance"]
