/**
 * Ensures packages/db/drizzle/meta/_journal.json matches on-disk *.sql migrations.
 * Run from repo root: node scripts/verify-drizzle-journal.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")
const drizzleDir = path.join(rootDir, "packages", "db", "drizzle")
const journalPath = path.join(drizzleDir, "meta", "_journal.json")

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

function main() {
  if (!fs.existsSync(journalPath)) {
    fail(`Missing journal: ${journalPath}`)
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"))
  const entries = journal.entries
  if (!Array.isArray(entries) || entries.length === 0) {
    fail("Journal has no entries")
  }

  const tags = entries.map((e) => e.tag)
  const duplicate = tags.filter((t, i) => tags.indexOf(t) !== i)
  if (duplicate.length) {
    fail(`Duplicate journal tags: ${[...new Set(duplicate)].join(", ")}`)
  }

  for (let i = 0; i < entries.length; i++) {
    const { idx, tag } = entries[i]
    if (idx !== i) {
      fail(`Journal idx mismatch at position ${i}: expected idx ${i}, got ${idx} (tag ${tag})`)
    }
    const sqlPath = path.join(drizzleDir, `${tag}.sql`)
    if (!fs.existsSync(sqlPath)) {
      fail(`Journal references missing file: ${path.relative(rootDir, sqlPath)}`)
    }
  }

  const sqlFiles = fs
    .readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => f.slice(0, -".sql".length))
    .sort()

  const tagSet = new Set(tags)
  for (const base of sqlFiles) {
    if (!tagSet.has(base)) {
      fail(`SQL file not listed in journal: packages/db/drizzle/${base}.sql`)
    }
  }

  if (sqlFiles.length !== tags.length) {
    fail(`Count mismatch: ${sqlFiles.length} SQL files vs ${tags.length} journal entries`)
  }

  console.log(`OK: ${tags.length} Drizzle migrations in journal match packages/db/drizzle/*.sql`)
}

main()
