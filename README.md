# Finanshels Partner Portal

Monorepo for the Finanshels partner-facing portal and the internal admin portal.

This repo is set up as npm workspaces and currently ships two active Next.js apps:

- `apps/partner`: partner registration, profile management, lead submission, service requests, commissions, agreement signing
- `apps/admin`: internal operations portal for partner approvals, analytics, leads, service requests, invoices, commissions, and user management

Shared code lives under `packages/*` for auth, database access, UI, notifications, Zoho integrations, commission logic, and shared types.

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth
- Drizzle ORM
- Supabase Postgres
- SendGrid
- Zoho CRM + WorkDrive
- npm workspaces

## Quick Start

### 1. Prerequisites

You need:

- Node.js `20+`
- npm `10+`
- A Supabase project with Postgres enabled
- Supabase Auth publishable and secret keys
- `lsof` available in your shell path
- `psql` installed if you want to apply the Supabase bootstrap SQL locally

Check your versions:

```bash
node -v
npm -v
```

Install dependencies:

```bash
npm install
```

### 2. Create Local Environment Files

Start with the root env file:

```bash
cp .env.example .env.local
```

App-level env files are optional. Only create them if you need to override values for one app:

```bash
cp apps/admin/.env.local.example apps/admin/.env.local
cp apps/partner/.env.local.example apps/partner/.env.local
```

Env loading order during local development is:

1. root `.env.local`
2. app `.env.local`
3. current shell environment

That means shell vars win, and app-level vars override the root file.

### 3. Set the Required Environment Variables

At minimum, local development requires these values:

```bash
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_URL_DIRECT=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
NEXT_PUBLIC_PARTNER_APP_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3001
```

Important:

- `DEFAULT_TENANT_ID` is required by both apps at runtime
- if you use the seeded local tenant, keep it as `00000000-0000-0000-0000-000000000001`
- keep Supabase auth values aligned across root and app env files or auth behavior becomes confusing
- `DATABASE_URL` is the Supabase runtime connection and should use the pooler host
- `DATABASE_URL_DIRECT` is the direct Supabase host for Drizzle migrations and bootstrap SQL

Optional integrations, only needed if you are working on those flows:

- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_BASE_URL`
- `ZOHO_WORKDRIVE_ACCESS_TOKEN`
- `ZOHO_WORKDRIVE_BASE_URL`
- `ZOHO_WORKDRIVE_ROOT_FOLDER_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

### 4. Prepare the Database

Run migrations against the direct Supabase connection:

```bash
npm run db:migrate
```

If you need to initialize a fresh Supabase database from the checked-in SQL snapshot:

```bash
npm run db:bootstrap:supabase
```

Then seed the default tenant and starter data:

```bash
npm run db:seed
```

The seed creates:

- default tenant `Finanshels`
- tenant ID `00000000-0000-0000-0000-000000000001`
- starter commission models
- starter services

If you do not seed the database, `DEFAULT_TENANT_ID` still needs to point to a real tenant row that already exists.

### 5. Start the Apps

Run both apps:

```bash
npm run dev
```

Local URLs:

- partner app: `http://localhost:3000`
- admin app: `http://localhost:3001`

The dev runner automatically stops stale `node` listeners on ports `3000` and `3001` before booting. If a non-Node process is using one of those ports, startup will fail and tell you which process to stop.

### 6. Verify the Setup

Sanity-check the repo with:

```bash
npm run type-check
npm run lint
```

Then open both apps in the browser:

- `http://localhost:3000`
- `http://localhost:3001/sign-in`

## Common Commands

| Task | Command |
| --- | --- |
| Run both apps | `npm run dev` |
| Run only app dev servers in parallel | `npm run dev:apps` |
| Run partner only | `npm run dev --workspace @repo/partner` |
| Run admin only | `npm run dev --workspace @repo/admin` |
| Type-check all workspaces | `npm run type-check` |
| Lint all workspaces | `npm run lint` |
| Build all workspaces | `npm run build` |
| Run tests where present | `npm run test` |
| Bootstrap Supabase from SQL | `npm run db:bootstrap:supabase` |
| Generate a Drizzle migration | `npm run db:generate` |
| Apply migrations | `npm run db:migrate` |
| Push schema directly | `npm run db:push` |
| Seed starter tenant and services | `npm run db:seed` |
| Open Drizzle Studio | `npm run db:studio` |
| Clean workspace artifacts | `npm run clean` |

## Repo Layout

```text
apps/
  admin/        Internal operations portal
  partner/      Partner-facing portal

packages/
  auth/         Shared auth helpers and rate limiting
  commission-engine/
  db/           Drizzle schema, client, migrations, seed
  notifications/
  types/
  ui/
  zoho/

docs/
  admin-user-guide.md
  partner-user-guide.md
  pending-and-production-readiness.md

scripts/
  dev.mjs             Boot both apps with shared env loading
  start-next-dev.mjs  Boot one app with the same env behavior
```

## Database Workflow

Schema and migrations live in `packages/db`. The supported database target is Supabase Postgres.

Rules for schema changes:

1. Update the schema under `packages/db/src/schema/*`
2. Generate the migration with `npm run db:generate`
3. Review the generated SQL under `packages/db/drizzle/*`
4. Apply it locally with `npm run db:migrate`
5. Ship schema and migration files in the same change

Notes:

- avoid hand-editing Drizzle metadata unless there is a real reason
- prefer checked-in migrations over ad hoc `db:push` changes
- Drizzle CLI can read Supabase database settings from the shell, `packages/db/.env.local`, root `.env.local`, or app `.env.local`
- use the Supabase pooler URL for runtime and the direct host for migrations or bootstrap SQL

## Working In This Repo

Use root scripts for common workflows. Use workspace-scoped commands when you need to target a single app or package.

Examples:

```bash
npm run dev --workspace @repo/admin
npm run type-check --workspace @repo/partner
npm run build --workspace @repo/db
```

Conventions worth following:

- do not commit `.next/`, build output, or local env files
- keep shared package APIs stable because both apps consume them
- treat schema changes, migrations, and any required seed updates as one change set

## Troubleshooting

### Missing or invalid env vars at boot

Both apps validate env on startup. If boot fails, check:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DEFAULT_TENANT_ID`

### Auth works in one app but not the other

You likely have conflicting Supabase auth values between the root `.env.local` and an app-level `.env.local`. Align them.

### The app boots but tenant-scoped data fails

Your `DEFAULT_TENANT_ID` does not exist in the database. Seed the default tenant or point the env var at an existing tenant UUID.

### The app cannot resolve the database host

You are probably using the wrong Supabase hostname. Runtime should use the pooler host, while migrations and bootstrap SQL should use the direct `db.<project-ref>.supabase.co` host.

### `npm run dev` fails because a port is busy

The scripts will kill stale `node` processes automatically. They will not kill non-Node processes. Stop the conflicting process and retry.

## Additional Docs

- [Admin user guide](docs/admin-user-guide.md)
- [Partner user guide](docs/partner-user-guide.md)
- [Pending items and production readiness](docs/pending-and-production-readiness.md)

## Deployment

The partner app and admin app are intended to be deployed separately. They share the same database and auth provider, but each deployment needs its own public URL configuration.

## Security

- never commit real `.env.local` files
- rotate any secret that has been exposed in chat, logs, screenshots, or terminal history
- treat database, Supabase Auth, SendGrid, Stripe, and Zoho credentials as production secrets
