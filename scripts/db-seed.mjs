import { spawnSync } from "node:child_process"
import { loadWorkspaceEnv, rootDir } from "./env.mjs"

const env = loadWorkspaceEnv()

if (!env.DATABASE_URL) {
  console.error("Missing Supabase DATABASE_URL in .env.local.")
  process.exit(1)
}

const npxBin = process.platform === "win32" ? "npx.cmd" : "npx"
const result = spawnSync(npxBin, ["tsx", "packages/db/src/seed.ts"], {
  cwd: rootDir,
  env,
  stdio: "inherit",
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 0)
