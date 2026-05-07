/**
 * Charset without 0/O, 1/I/L to reduce verbal misreads (Crockford-style).
 * Uppercase letters + digits 2–9 → 32 symbols.
 */
export const PARTNER_PROMO_CODE_SYMBOLS =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZ" as const

/** Normalized promo: 3–6 chars from {@link PARTNER_PROMO_CODE_SYMBOLS}. */
export const PARTNER_PROMO_CODE_REGEX = /^[23456789A-HJ-NP-Z]{3,6}$/

const RESERVED = new Set(
  (
    [
      "ADMIN",
      "API",
      "DEMO",
      "FTP",
      "HELP",
      "LOGIN",
      "NULL",
      "PARTNER",
      "PRICE",
      "PUBLIC",
      "QUOTE",
      "SETUP",
      "SIGNUP",
      "SMTP",
      "STAFF",
      "TEST",
      "VOID",
      "WWW",
      "NAN",
      "ROOT",
      "SYS",
      "USER",
      "NONE",
      "FREE",
      "ECHO",
      "OPEN",
      "INFO",
      "MAIL",
      "HTTP",
      "HTTPS",
      "JSON",
      "YAML",
      "SELF",
      "TRUE",
      "FALSE",
      "SKIP",
      "PASS",
      "FAIL",
      "WARN",
      "ERROR",
      "DEBUG",
      "PROD",
      "DEV",
      "STAGING",
      "LOCAL",
      "FINANCE",
      "SALES",
      "QUOTE1",
      "PARTN",
    ] as const
  ).map((s) => s.toUpperCase()),
)

/** Uppercase ASCII alphanumerics allowed after normalization pass. */
const STRICT_NORMALIZE_REGEX = /^[A-Z0-9]+$/

export function normalizePartnerPromoCodeInput(raw: string): string {
  return raw.trim().toUpperCase()
}

export function validatePartnerPromoCodeNormalized(
  normalized: string,
): { ok: true } | { ok: false; error: string } {
  if (!normalized.length) {
    return { ok: false, error: "Promo code is required." }
  }
  if (normalized.length < 3 || normalized.length > 6) {
    return {
      ok: false,
      error: "Promo code must be between 3 and 6 characters.",
    }
  }
  if (!STRICT_NORMALIZE_REGEX.test(normalized)) {
    return {
      ok: false,
      error: "Promo code may only contain letters and digits (A–Z, 0–9).",
    }
  }
  if (!PARTNER_PROMO_CODE_REGEX.test(normalized)) {
    return {
      ok: false,
      error:
        "Avoid ambiguous characters: use digits 2–9 and letters A–Z excluding I, L, O, and 0, 1.",
    }
  }
  if (RESERVED.has(normalized)) {
    return { ok: false, error: "This promo code is reserved. Choose another." }
  }
  return { ok: true }
}
