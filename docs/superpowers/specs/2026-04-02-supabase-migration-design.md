# Database Migration: Neon → Supabase

**Date:** 2026-04-02
**Status:** Approved
**Author:** Meet Patel

---

## Context

The Partner Portal is a Next.js monorepo (`apps/admin`, `apps/partner`) deployed on **Vercel**. It currently uses **Neon** (serverless PostgreSQL) with the `@neondatabase/serverless` driver and **Drizzle ORM**. The rest of the product infrastructure lives on GCP; this migration consolidates the database onto a single cloud provider ecosystem by moving to **Supabase** (PostgreSQL-compatible, GCP-backed).

---

## Decision

**Migrate from Neon to Supabase** using a short maintenance-window cutover (`pg_dump` + `pg_restore`).

Supabase was chosen over GCP Cloud SQL + PgBouncer because:
- Supabase has **Supavisor** built-in (connection pooler — no separate PgBouncer service to manage)
- Native **Vercel Marketplace integration** (auto-provisions env vars)
- Standard PostgreSQL wire protocol — minimal code change from Neon
- Drizzle ORM works without modification

---

## Architecture

```
Vercel (apps/admin + apps/partner)
        │
        │ SSL/TLS (public internet)
        │ DATABASE_URL → transaction pooler (port 6543)
        ▼
  Supabase Supavisor (connection pooler, built-in)
        │
        │ internal
        ▼
  Supabase PostgreSQL 16
  - automated backups
  - point-in-time recovery
  - region: closest to existing GCP infra
```

**Two connection strings:**

| Env var | URL format | Port | Used by |
|---|---|---|---|
| `DATABASE_URL` | `postgres://...pooler.supabase.com` | `6543` | App runtime (Vercel serverless) |
| `DATABASE_URL_DIRECT` | `postgres://...supabase.com` | `5432` | `drizzle-kit` migrations (DDL only) |

The split is necessary because Supavisor transaction mode doesn't support session-level DDL statements that `drizzle-kit migrate` uses.

---

## Code Changes

### 1. `packages/db/package.json`

Remove `@neondatabase/serverless`, add `postgres`:

```diff
- "@neondatabase/serverless": "^0.10.4"
+ "postgres": "^3.4.5"
```

### 2. `packages/db/src/client.ts`

Swap Neon HTTP driver for `postgres-js`:

```diff
- import { neon } from "@neondatabase/serverless"
- import { drizzle } from "drizzle-orm/neon-http"
+ import postgres from "postgres"
+ import { drizzle } from "drizzle-orm/postgres-js"

function createDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
- const sql = neon(databaseUrl)
- return drizzle(sql, { schema })
+ const client = postgres(databaseUrl, { prepare: false }) // prepare:false required for transaction pooler
+ return drizzle(client, { schema })
}
```

> `prepare: false` is required when connecting through Supavisor in transaction mode — prepared statements are not supported across pooled connections.

### 3. `packages/db/drizzle.config.ts`

Use the direct connection URL for migrations:

```diff
const databaseUrl = [
-  process.env.DATABASE_URL,
+  process.env.DATABASE_URL_DIRECT,
+  process.env.DATABASE_URL,
   ...envSources.map(...)
].find(isUsableValue)
```

Add `DATABASE_URL_DIRECT` to the env sources lookup order so `drizzle-kit` picks up the direct connection.

### 4. Vercel Environment Variables

Set in both `admin` and `partner` Vercel projects (or via Supabase Vercel integration):

| Var | Value |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler URL (port 6543) |
| `DATABASE_URL_DIRECT` | Supabase direct connection URL (port 5432) |

---

## Migration Steps

### Phase 1 — Setup Supabase

1. Create new Supabase project in GCP region closest to existing infrastructure
2. Note the two connection strings (pooler + direct) from **Project Settings → Database**
3. Install the [Supabase Vercel integration](https://vercel.com/marketplace/supabase) — auto-injects `DATABASE_URL` (pooler) into Vercel env vars

### Phase 2 — Dump from Neon

```bash
pg_dump \
  --no-owner \
  --no-acl \
  --schema=public \
  "$NEON_DATABASE_URL" \
  -f backup.sql
```

### Phase 3 — Restore to Supabase

```bash
psql "$SUPABASE_DIRECT_URL" -f backup.sql
```

Verify row counts match Neon source:
```sql
SELECT schemaname, tablename, n_live_tup
FROM pg_stat_user_tables
ORDER BY tablename;
```

### Phase 4 — Code changes + local test

1. Update `packages/db/src/client.ts` and `packages/db/package.json`
2. Set `DATABASE_URL` (pooler) and `DATABASE_URL_DIRECT` (direct) in local `.env.local`
3. Run `npm install` to swap drivers
4. Run `drizzle-kit migrate` to confirm migrations apply cleanly against Supabase
5. Start dev servers and smoke-test: login, partner list, lead creation, admin dashboard

### Phase 5 — Maintenance window cutover

1. Put apps in maintenance / read-only (or accept brief downtime)
2. Final `pg_dump` from Neon to catch any writes since Phase 2
3. Final `psql` restore to Supabase
4. Update `DATABASE_URL` in Vercel env vars to point to Supabase pooler
5. Add `DATABASE_URL_DIRECT` in Vercel env vars
6. Trigger redeploy on both `admin` and `partner` projects
7. Verify production: login, key flows, admin dashboard
8. Remove Neon integration from Vercel

### Phase 6 — Cleanup

- Delete Neon project (keep 7-day backup window before deleting)
- Remove `@neondatabase/serverless` references from any remaining config or comments

---

## What Does NOT Change

- All schema files (`packages/db/src/schema/*`)
- All Drizzle migration files (`packages/db/drizzle/`)
- All app-level code in `apps/admin` and `apps/partner`
- All API routes
- Drizzle ORM version
- `drizzle.config.ts` dialect (`postgresql`)

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Data loss during cutover | Final dump immediately before cutover; verify row counts |
| `prepared statement` errors with pooler | `prepare: false` in postgres-js client config |
| `drizzle-kit migrate` fails through pooler | Use `DATABASE_URL_DIRECT` for all migration commands |
| Supabase row-level security blocks queries | RLS is disabled by default; enable only explicitly if needed |
| Auth (Clerk) unaffected | Clerk is independent of the database layer |
