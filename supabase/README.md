# Supabase-Only Migration Workflow

This project can be managed directly from Supabase without relying on Drizzle migration commands.

## Goal

- Make schema changes in Supabase (SQL Editor or CLI).
- Track every applied change in `public.schema_change_log`.
- Keep SQL files in this repo under `supabase/migrations/`.

## One-Time Setup

Already bootstrapped on the live project:

- `public.schema_change_log` table
- RLS enabled
- `anon` and `authenticated` access revoked

## Daily Workflow

1. Create a local SQL file template:

   - `npm run supabase:migration:new -- <short-change-name>`
   - Example: `npm run supabase:migration:new -- add_partner_owner_index`

2. Open the generated SQL file in `supabase/migrations/` and write your SQL.

3. Apply SQL directly in Supabase:

   - Supabase Dashboard -> SQL Editor, paste and run, or
   - Supabase CLI (if installed): `supabase db push`-style flow for your setup.

4. Verify immediately using follow-up SQL query (in SQL Editor):

   - Example checks:
   - `select * from information_schema.columns where table_name = 'partners';`
   - `select * from pg_indexes where tablename = 'partners';`

5. Log the change in `public.schema_change_log`:

   - Insert a row with `change_key`, title, and `sql_file`.
   - Use the same `change_key` inside the SQL file + log row.

## Recommended SQL Footer Pattern

Add this at the end of each migration SQL:

```sql
insert into public.schema_change_log (change_key, title, sql_file, notes, applied_by)
values (
  '20260507133000_add_partner_owner_index',
  'Add partner owner index',
  'supabase/migrations/20260507133000_add_partner_owner_index.sql',
  'Improves partner owner lookups',
  'meet@finanshels.com'
)
on conflict (change_key) do nothing;
```

## Useful Commands

- `npm run supabase:checklist` -> prints checklist and preflight.
- `npm run supabase:migration:new -- <name>` -> creates timestamped SQL file template.
- `npm run supabase:login` -> authenticate Supabase CLI in browser.
- `npm run supabase:link` -> link this repo to project `ezyeyuslykludhtxryzr`.
- `npm run supabase:projects` -> list projects (requires login).

## CLI Setup (One Time)

1. Install CLI:

   - `brew tap supabase/tap`
   - `brew install supabase`

2. Login (opens browser):

   - `npm run supabase:login`

3. Link this repo:

   - `npm run supabase:link`

4. Confirm access:
   - `npm run supabase:projects`

## Important

- Do not run `npm run db:migrate` if you want to stay Supabase-only.
- Keep schema changes in `supabase/migrations/` for auditability.
