import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import postgres from "postgres"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"

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

async function pickReachableDatabaseUrl() {
  const candidates = [process.env.DATABASE_URL_DIRECT, process.env.DATABASE_URL]
    .map((value) => value?.trim())
    .filter(Boolean)

  for (const candidate of [...new Set(candidates)]) {
    const testClient = postgres(candidate, {
      prepare: false,
      max: 1,
      connect_timeout: 5,
    })

    try {
      await testClient`select 1`
      await testClient.end({ timeout: 5 })
      return candidate
    } catch {
      await testClient.end({ timeout: 5 })
    }
  }

  return null
}

async function main() {
  setEnvDefaults()

  const databaseUrl = await pickReachableDatabaseUrl()
  if (!databaseUrl) {
    throw new Error("Could not connect with DATABASE_URL_DIRECT or DATABASE_URL. Check env values and network access to Supabase.")
  }

  process.env.DATABASE_URL_DIRECT = databaseUrl
  process.env.DATABASE_URL = databaseUrl

  const sql = postgres(databaseUrl, { prepare: false })

  try {
    console.log("Seeding default tenant, commission models, and services...")

    await sql`
      insert into tenants (id, name, slug, plan, is_active)
      values (${DEFAULT_TENANT_ID}::uuid, 'Finanshels', 'finanshels', 'enterprise', true)
      on conflict (id) do update set
        name = excluded.name,
        slug = excluded.slug,
        plan = excluded.plan,
        is_active = excluded.is_active,
        updated_at = now();
    `

    const modelRows = [
      {
        name: "Standard 10%",
        type: "flat_pct",
        config: JSON.stringify({ pct: 10 }),
      },
      {
        name: "Tiered Commission",
        type: "tiered",
        config: JSON.stringify({
          tiers: [
            { min: 0, max: 5, pct: 8 },
            { min: 6, max: 10, pct: 12 },
            { min: 11, max: null, pct: 15 },
          ],
          period: "monthly",
        }),
      },
      {
        name: "Milestone Rewards",
        type: "milestone",
        config: JSON.stringify({
          milestones: [
            { target: 10, reward: 500 },
            { target: 25, reward: 1500 },
            { target: 50, reward: 5000 },
          ],
          currency: "AED",
        }),
      },
    ]

    for (const row of modelRows) {
      await sql`
        insert into commission_models (tenant_id, name, type, config, is_active)
        values (${DEFAULT_TENANT_ID}::uuid, ${row.name}, ${row.type}, ${row.config}, true)
        on conflict do nothing;
      `
    }

    const serviceRows = [
      ["Tax Registration (VAT)", "Tax", "3000"],
      ["VAT Filing", "Tax", "1500"],
      ["Bookkeeping (Monthly)", "Accounting", "2000"],
      ["Company Formation", "Corporate", "5000"],
      ["Audit Services", "Audit", "8000"],
      ["CFO Services", "Advisory", "10000"],
    ]

    for (const [name, category, basePrice] of serviceRows) {
      await sql`
        insert into services (tenant_id, name, category, base_price, is_active)
        values (${DEFAULT_TENANT_ID}::uuid, ${name}, ${category}, ${basePrice}, true)
        on conflict do nothing;
      `
    }

    console.log("Seed complete.")
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
