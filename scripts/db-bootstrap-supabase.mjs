import { spawnSync } from "node:child_process"
import path from "node:path"
import { loadWorkspaceEnv, rootDir } from "./env.mjs"

const env = loadWorkspaceEnv()
const databaseUrl =
  env.DATABASE_URL_DIRECT ||
  env.DATABASE_URL

if (!databaseUrl) {
  console.error("Missing Supabase database URL. Set DATABASE_URL_DIRECT or DATABASE_URL in .env.local.")
  process.exit(1)
}

const sqlFile = path.join(rootDir, "scripts", "supabase-bootstrap.sql")
const result = spawnSync("psql", [databaseUrl, "-f", sqlFile], {
  cwd: rootDir,
  env,
  stdio: "inherit",
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 0)
