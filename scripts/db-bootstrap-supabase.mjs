import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const env = {}
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    env[key] = value
  }

  return env
}

function setEnvDefaults() {
  const envSources = [
    parseEnvFile(path.join(rootDir, ".env.local")),
    parseEnvFile(path.join(rootDir, "packages", "db", ".env.local")),
    parseEnvFile(path.join(rootDir, "apps", "admin", ".env.local")),
    parseEnvFile(path.join(rootDir, "apps", "partner", ".env.local")),
  ]

  for (const source of envSources) {
    for (const [key, value] of Object.entries(source)) {
      if (!process.env[key] && value) {
        process.env[key] = value
      }
    }
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: rootDir,
    env: process.env,
    ...options,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function tryRun(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: "inherit",
    cwd: rootDir,
    env: {
      ...process.env,
      PGCONNECT_TIMEOUT: process.env.PGCONNECT_TIMEOUT || "5",
    },
    ...options,
  })
}

function getDatabaseCandidates() {
  const values = [process.env.DATABASE_URL_DIRECT, process.env.DATABASE_URL]
    .map((value) => value?.trim())
    .filter(Boolean)

  return [...new Set(values)]
}

function pickReachableDatabaseUrl() {
  const candidates = getDatabaseCandidates()
  if (candidates.length === 0) {
    return null
  }

  for (const url of candidates) {
    const test = tryRun("psql", [url, "-v", "ON_ERROR_STOP=1", "-c", "select 1;"])
    if (test.status === 0) {
      return url
    }
  }

  return null
}

function main() {
  setEnvDefaults()

  const databaseUrl = pickReachableDatabaseUrl()
  if (!databaseUrl) {
    console.error("Could not connect with DATABASE_URL_DIRECT or DATABASE_URL. Check env values and network access to Supabase.")
    process.exit(1)
  }

  process.env.DATABASE_URL_DIRECT = databaseUrl
  process.env.DATABASE_URL = databaseUrl

  const sqlFilePath = path.join(__dirname, "supabase-bootstrap.sql")
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`Missing SQL file: ${sqlFilePath}`)
    process.exit(1)
  }

  console.log("Resetting Supabase public schema...")
  run("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlFilePath])

  console.log("Applying Drizzle migrations...")
  run("npm", ["run", "db:migrate"])

  console.log("Supabase bootstrap complete.")
}

main()
