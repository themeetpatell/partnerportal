import type { User } from "@supabase/supabase-js"

export interface AppAuthUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  partnerType: "referral" | "channel" | null
}

export function mapSupabaseUser(user: User | null): AppAuthUser | null {
  if (!user?.id || !user.email) {
    return null
  }

  const metadata = user.user_metadata ?? {}
  const firstName =
    typeof metadata.first_name === "string" && metadata.first_name.trim()
      ? metadata.first_name.trim()
      : null
  const lastName =
    typeof metadata.last_name === "string" && metadata.last_name.trim()
      ? metadata.last_name.trim()
      : null
  const fullName =
    typeof metadata.full_name === "string" && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : firstName || lastName
        ? [firstName, lastName].filter(Boolean).join(" ")
        : null
  const partnerType =
    metadata.partner_type === "referral" || metadata.partner_type === "channel"
      ? metadata.partner_type
      : null

  return {
    id: user.id,
    email: user.email,
    firstName,
    lastName,
    fullName,
    partnerType,
  }
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
