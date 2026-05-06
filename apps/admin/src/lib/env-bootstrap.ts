/**
 * Bootstrap-only env checks for `instrumentation.ts`.
 * Kept free of zod so the instrumentation bundle stays small and webpack’s
 * persistent cache does not serialize a huge dependency graph.
 */
const REQUIRED = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "DEFAULT_TENANT_ID",
] as const

export function assertRequiredEnvForBootstrap() {
  const missing = REQUIRED.filter((key) => {
    const v = process.env[key]
    return typeof v !== "string" || v.trim() === ""
  })

  if (missing.length === 0) return

  console.error(`\n❌ Missing environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n`)
  throw new Error("Missing environment variables. See above for details.")
}
