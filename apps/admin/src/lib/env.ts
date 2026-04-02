import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"),
  DEFAULT_TENANT_ID: z.string().uuid("DEFAULT_TENANT_ID must be a valid UUID"),

  // Optional integrations
  SUPABASE_SECRET_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  ZOHO_CLIENT_ID: z.string().optional(),
  ZOHO_CLIENT_SECRET: z.string().optional(),
  ZOHO_REFRESH_TOKEN: z.string().optional(),
})

export function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n")
    console.error(`\n❌ Invalid environment variables:\n${formatted}\n`)
    throw new Error("Missing or invalid environment variables. See above for details.")
  }
}

export function getRequiredTenantId() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    throw new Error("DEFAULT_TENANT_ID is missing or invalid.")
  }

  return result.data.DEFAULT_TENANT_ID
}
