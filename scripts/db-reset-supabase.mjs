import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function main() {
  console.log("1/2 Bootstrap clean Supabase schema")
  run("node", ["./scripts/db-bootstrap-supabase.mjs"])

  console.log("2/2 Seed baseline project data")
  run("node", ["./scripts/db-seed.mjs"])

  console.log("Supabase reset + seed complete.")
}

main()
