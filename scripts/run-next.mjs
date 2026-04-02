import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { loadWorkspaceEnv } from "./env.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")
const appDir = process.cwd()

loadWorkspaceEnv({ rootDir, appDir })

const require = createRequire(import.meta.url)
const nextBin = require.resolve("next/dist/bin/next")
const args = process.argv.slice(2)

const result = spawnSync(process.execPath, [nextBin, ...args], {
  cwd: appDir,
  stdio: "inherit",
  env: process.env,
})

process.exit(result.status ?? 1)
