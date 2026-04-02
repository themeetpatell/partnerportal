import fs from "node:fs"
import path from "node:path"
import type { Config } from "drizzle-kit"

const dbDir = __dirname
const rootDir = path.resolve(dbDir, "..", "..")

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const env: Record<string, string> = {}
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

function isUsableValue(value: string | undefined) {
  return Boolean(value && value.trim() && !value.includes("..."))
}

const envSources = [
  parseEnvFile(path.join(dbDir, ".env.local")),
  parseEnvFile(path.join(rootDir, ".env.local")),
  parseEnvFile(path.join(rootDir, "apps", "partner", ".env.local")),
  parseEnvFile(path.join(rootDir, "apps", "admin", ".env.local")),
]

for (const source of envSources) {
  for (const [key, value] of Object.entries(source)) {
    if (!process.env[key] && isUsableValue(value)) {
      process.env[key] = value
    }
  }
}

const databaseUrl = [process.env.DATABASE_URL, process.env.DATABASE_URL_DIRECT, ...envSources.map((source) => source.DATABASE_URL ?? source.DATABASE_URL_DIRECT)].find(
  isUsableValue,
)

if (!databaseUrl) {
  throw new Error(
    "Supabase database URL is missing. Set DATABASE_URL or DATABASE_URL_DIRECT in the shell or in .env.local at the repo root, packages/db, apps/partner, or apps/admin.",
  )
}

export default {
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config
