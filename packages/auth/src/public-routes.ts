export const PUBLIC_PARTNER_ROUTES = [
  "/",
  "/auth/continue(.*)",
  "/auth/callback(.*)",
  "/auth/verify(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/register(.*)",
  "/forgot-password(.*)",
  "/reset-password(.*)",
  "/api/auth/confirm",
  "/api/auth/forgot-password",
  "/api/auth/test-email",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
]

export const PUBLIC_ADMIN_ROUTES = [
  "/auth/verify(.*)",
  "/sign-in(.*)",
  "/reset-password(.*)",
]
