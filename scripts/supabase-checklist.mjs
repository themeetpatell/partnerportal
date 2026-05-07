import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

const cwd = process.cwd()
const migrationsDir = join(cwd, "supabase", "migrations")
const hasMigrationsDir = existsSync(migrationsDir)
const migrationFiles = hasMigrationsDir
  ? readdirSync(migrationsDir).filter((file) => file.endsWith(".sql"))
  : []

const cliCheck = spawnSync("supabase", ["--version"], { encoding: "utf8" })
const cliAvailable = cliCheck.status === 0
const cliVersion = (cliCheck.stdout || "").trim()

console.log("")
console.log("Supabase Migration Checklist")
console.log("============================")
console.log(`- Migrations directory: ${hasMigrationsDir ? "OK" : "Missing"}`)
console.log(`- Local SQL migration files: ${migrationFiles.length}`)
console.log(`- Supabase CLI: ${cliAvailable ? `Installed (${cliVersion})` : "Not installed"}`)
console.log("")

console.log("Run this flow for every DB change:")
console.log("1) Create a migration template")
console.log("   npm run supabase:migration:new -- <change-name>")
console.log("")
console.log("2) Edit the generated SQL file under supabase/migrations/")
console.log("")
console.log("3) Apply SQL directly in Supabase SQL Editor")
console.log("   (or via Supabase CLI if installed)")
console.log("")
console.log("4) Verify immediately with SELECT checks")
console.log("   Example: information_schema.columns / pg_indexes")
console.log("")
console.log("5) Confirm a row exists in public.schema_change_log")
console.log("   with the same change_key as your SQL file")
console.log("")

if (!cliAvailable) {
  console.log("Optional CLI install:")
  console.log("  brew install supabase/tap/supabase")
  console.log("")
}

console.log("Docs: supabase/README.md")
