import { mkdirSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"

function toTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0")
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join("")
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

const rawName = process.argv.slice(2).join(" ").trim()
if (!rawName) {
  console.error("Usage: npm run supabase:migration:new -- <change-name>")
  process.exit(1)
}

const slug = slugify(rawName)
if (!slug) {
  console.error("Please provide a valid migration name.")
  process.exit(1)
}

const ts = toTimestamp(new Date())
const fileName = `${ts}_${slug}.sql`
const migrationsDir = join(process.cwd(), "supabase", "migrations")
const filePath = join(migrationsDir, fileName)
const changeKey = `${ts}_${slug}`

mkdirSync(migrationsDir, { recursive: true })

if (existsSync(filePath)) {
  console.error(`Migration already exists: ${filePath}`)
  process.exit(1)
}

const template = `-- Migration: ${fileName}
-- Title: ${rawName}
-- change_key: ${changeKey}

begin;

-- Write your schema/data changes here.
-- Example:
-- alter table public.partners add column example_column text;

-- Verify statements can be added as comments for manual checks.
-- Example:
-- select column_name from information_schema.columns where table_name = 'partners';

insert into public.schema_change_log (change_key, title, sql_file, notes, applied_by)
values (
  '${changeKey}',
  '${rawName.replace(/'/g, "''")}',
  'supabase/migrations/${fileName}',
  'Applied via Supabase SQL Editor/CLI',
  '<your-email>'
)
on conflict (change_key) do nothing;

commit;
`

writeFileSync(filePath, template, "utf8")
console.log(`Created migration template: ${filePath}`)
