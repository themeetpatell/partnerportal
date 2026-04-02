import type { User } from "@supabase/supabase-js"

export interface AppAuthUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  emailAddresses: { emailAddress: string }[]
  primaryEmailAddress: { emailAddress: string } | null
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

  return {
    id: user.id,
    email: user.email,
    firstName,
    lastName,
    fullName,
    emailAddresses: [{ emailAddress: user.email }],
    primaryEmailAddress: { emailAddress: user.email },
  }
}

export function getSupabaseAuthEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required")
  }

  if (!publishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required")
  }

  return { url, publishableKey }
}
