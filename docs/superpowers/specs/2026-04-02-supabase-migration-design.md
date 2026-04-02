# Supabase Database Runbook

**Date:** 2026-04-02
**Status:** Approved
**Author:** Meet Patel

---

## Context

The Partner Portal is a Next.js monorepo (`apps/admin`, `apps/partner`) deployed on **Vercel** and backed by **Supabase Postgres** with **Drizzle ORM**.

---

## Architecture

```text
Vercel (apps/admin + apps/partner)
        |
        | SSL/TLS (public internet)
        | DATABASE_URL -> transaction pooler (port 6543)
        v
  Supabase Supavisor (connection pooler)
        |
        | internal
        v
  Supabase PostgreSQL 16
  - automated backups
  - point-in-time recovery
```

**Two connection strings:**

| Env var | URL format | Port | Used by |
|---|---|---|---|
| `DATABASE_URL` | `postgres://...pooler.supabase.com` | `6543` | App runtime |
| `DATABASE_URL_DIRECT` | `postgres://...supabase.com` | `5432` | `drizzle-kit` migrations |

The split is required because transaction pooling is optimized for request workloads, while schema migrations should use a direct database connection.

---

## Implementation Notes

### Database Client

- Package: `postgres`
- Drizzle adapter: `drizzle-orm/postgres-js`
- Client option: `prepare: false` for compatibility with pooled runtime connections

### Migration Config

`drizzle-kit` should resolve environment variables in this order:

1. `DATABASE_URL_DIRECT`
2. `DATABASE_URL`
3. fallback values from local env files

---

## Environment Setup

Set these values in both Vercel projects (`admin` and `partner`):

| Var | Value |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler URL (port 6543) |
| `DATABASE_URL_DIRECT` | Supabase direct connection URL (port 5432) |

For local development, mirror the same variable names in `.env.local`.

---

## Operational Steps

### Local Verification

1. Ensure `DATABASE_URL` and `DATABASE_URL_DIRECT` are set.
2. Run `npm install`.
3. Run `npm run db:migrate`.
4. Run `npm run dev`.
5. Smoke-test login, partner flows, and admin dashboard views.

### Production Verification

1. Confirm env vars exist in both Vercel projects.
2. Trigger redeploy for both apps.
3. Verify auth, dashboard data, lead flows, and service-request flows.
4. Monitor error logs for connection or migration failures.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Pooled connection incompatibility for migration commands | Use `DATABASE_URL_DIRECT` for all migration commands |
| Runtime connection errors from prepared statements | Keep `prepare: false` in postgres-js client config |
| Misconfigured environment values across apps | Keep env variable names consistent in root and app-level env files |
