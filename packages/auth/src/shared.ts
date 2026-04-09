import type { User } from "@supabase/supabase-js"

export interface AppAuthUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  partnerType: "referral" | "channel" | null
}

function normalizeMetadataValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function mapJwtClaimsToUser(claims: Record<string, unknown> | null | undefined): AppAuthUser | null {
  if (!claims) {
    return null
  }

  const id = normalizeMetadataValue(claims.sub)
  const email = normalizeMetadataValue(claims.email)

  if (!id || !email) {
    return null
  }

  const metadata =
    claims.user_metadata && typeof claims.user_metadata === "object"
      ? (claims.user_metadata as Record<string, unknown>)
      : {}

  const firstName = normalizeMetadataValue(metadata.first_name)
  const lastName = normalizeMetadataValue(metadata.last_name)
  const fullName =
    normalizeMetadataValue(metadata.full_name) ||
    (firstName || lastName ? [firstName, lastName].filter(Boolean).join(" ") : null)
  const rawPartnerType = normalizeMetadataValue(metadata.partner_type)
  const partnerType =
    rawPartnerType === "referral" || rawPartnerType === "channel"
      ? rawPartnerType
      : null

  return {
    id,
    email,
    firstName,
    lastName,
    fullName,
    partnerType,
  }
}

export function mapSupabaseUser(user: User | null): AppAuthUser | null {
  if (!user?.id || !user.email) {
    return null
  }

  return mapJwtClaimsToUser({
    sub: user.id,
    email: user.email,
    user_metadata: user.user_metadata ?? {},
  })
}

export function getSupabaseAuthEnv() {
  const env = getOptionalSupabaseAuthEnv()

  if (!env) {
    throw new Error("Supabase auth environment variables are required")
  }

  return env
}

export function getOptionalSupabaseAuthEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url || !publishableKey) {
    return null
  }

  return { url, publishableKey }
}
