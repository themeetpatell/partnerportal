# Pending Items & Production Readiness Checklist

> Generated after full A-Z codebase audit. Both `apps/partner` and `apps/admin` build with **0 errors**.  
> Items are prioritized: **P0** = must fix before launch, **P1** = should fix before launch, **P2** = post-launch improvement.

---

## Table of Contents

1. [Security](#1-security)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Multi-Tenancy](#3-multi-tenancy)
4. [API Completeness](#4-api-completeness)
5. [Missing UI Pages / Features](#5-missing-ui-pages--features)
6. [Data Integrity & Validation](#6-data-integrity--validation)
7. [External Integrations](#7-external-integrations)
8. [Performance & Scalability](#8-performance--scalability)
9. [Infrastructure & DevOps](#9-infrastructure--devops)
10. [UX Polish](#10-ux-polish)
11. [Documentation & Onboarding](#11-documentation--onboarding)
12. [Summary Scoreboard](#12-summary-scoreboard)

---

## 1. Security

### P0 — Rate Limiting on API Routes

**Status:** Not implemented  
**Location:** All routes in `apps/admin/src/app/api/` and `apps/partner/src/app/api/`  
**Issue:** No rate limiting exists on any endpoint. Brute-force attacks on form submissions, approval/rejection, or lead creation are possible.  
**Fix:** Add middleware-level rate limiting (e.g., `@upstash/ratelimit` with Redis, or Vercel Edge rate-limit headers). Apply per-IP and per-user limits to mutating endpoints.

### P0 — API Key Hash Uses Plain Hash

**Status:** Schema defined, not implemented  
**Location:** `packages/db/src/schema/documents.ts` — `apiKeys` table has `keyHash` column  
**Issue:** Column name implies hashing, but no code generates or validates API keys. When implemented, must use bcrypt or argon2, not SHA-256.  
**Fix:** When building API key feature, use `bcrypt.hash()` for storage and `bcrypt.compare()` for validation.

### P0 — Webhook Secret Hash

**Status:** Schema defined, not implemented  
**Location:** `packages/db/src/schema/documents.ts` — `webhooks` table has `secretHash` column  
**Issue:** Same as API keys — must use bcrypt, not plain hash.  
**Fix:** Use HMAC-SHA256 for webhook signature verification, bcrypt for storage of secrets.

### P1 — File Upload Validation

**Status:** No server-side validation  
**Location:** `packages/zoho/src/workdrive.ts` — `uploadToWorkdrive()`  
**Issue:** The function accepts any `mimeType` and `fileName` without server-side validation. Malicious file types (executables, scripts) could be uploaded.  
**Fix:** Add a server-side allowlist of MIME types (PDF, DOCX, XLSX, PNG, JPG) and enforce max file size (e.g., 10 MB) before uploading.

### P1 — CSRF Protection on Form Submissions

**Status:** Partial (Next.js Server Actions have built-in CSRF tokens, but some routes use raw `fetch`)  
**Issue:** API routes called via client-side `fetch` (e.g., `approve`, `reject`, `register`) lack explicit CSRF tokens.  
**Fix:** Supabase session middleware provides session validation; verify all mutating endpoints require a valid authenticated session.

### P2 — Audit Log IP Address Collection

**Status:** Schema has `ipAddress` column, never populated  
**Location:** `packages/db/src/schema/documents.ts` — `auditLogs` table  
**Fix:** Pass `req.headers.get('x-forwarded-for')` to `logActivity()` calls.

---

## 2. Authentication & Authorization

### P0 — Approve/Reject Routes Lack RBAC

**Status:** Bug — any authenticated admin-portal user can approve/reject partners  
**Location:**
- `apps/admin/src/app/api/partners/[id]/approve/route.ts`
- `apps/admin/src/app/api/partners/[id]/reject/route.ts`

**Issue:** These routes only check `auth().userId` (is logged in) but do NOT verify the user's role. A viewer or appointment_setter could approve/reject partners.  
**Fix:** Add `teamMembers` role check — only `admin` and `partnership` roles should be allowed. Pattern already exists in:
- `apps/admin/src/app/api/partners/[id]/route.ts` (PUT handler — has proper RBAC)
- `apps/admin/src/app/api/admin/leads/route.ts` (POST handler — has proper RBAC)

### P0 — Partner Registration Creates Placeholder Auth User ID

**Status:** Bug — manually-created partners have `manual_${uuid}` as clerkUserId  
**Location:** `apps/admin/src/app/(dashboard)/partners/new/page.tsx`  
**Issue:** Admin-created partners get a fake auth user ID that doesn't map to a real Supabase Auth account. These partners cannot log in, and any query filtering by `authUserId` will fail.  
**Fix:** Either:
1. Create the real Supabase Auth user up front and use that user ID, or
2. Add a nullable `authUserId` and handle the "no auth account" case in queries.

### P1 — Analytics Export Route Lacks Auth Check

**Status:** Needs verification  
**Location:** `apps/admin/src/app/api/admin/analytics/export/route.ts`  
**Issue:** Verify that the export CSV endpoint checks authentication and role permissions. Currently it reads `teamMemberId` from query params but may not verify the caller's role.

### P1 — Commission Approve Route Needs RBAC

**Status:** Needs verification  
**Location:** `apps/admin/src/app/api/admin/commissions/[id]/approve/route.ts`  
**Issue:** Should be restricted to `admin` and `finance` roles only.

### P2 — Row-Level Scope Not Enforced

**Status:** Schema supports it, not enforced in queries  
**Location:** `packages/db/src/schema/partners.ts` — `teamMembers.rowScope` (`own | team | all`)  
**Issue:** `rowScope` column exists but no query applies it. A sales user with `rowScope: "own"` sees all records.  
**Fix:** Create a shared query filter utility that applies `rowScope` based on the current user's team member record.

---

## 3. Multi-Tenancy

### P0 — Hard-Coded Tenant ID in Partner Registration

**Status:** Bug  
**Location:** `apps/partner/src/app/api/register/route.ts` line 9  
**Code:** `const PLACEHOLDER_TENANT_ID = "00000000-0000-0000-0000-000000000001"`  
**Issue:** Every new partner registration uses the same hard-coded UUID. If the tenant doesn't exist in the DB, registrations silently fail with a foreign-key error.  
**Fix:** Resolve tenant from the request domain (custom domain or slug) or from an environment variable (`DEFAULT_TENANT_ID`).

### P0 — Admin Routes Use `process.env.DEFAULT_TENANT_ID!`

**Status:** Works but fragile  
**Location:** 6 admin API routes use `process.env.DEFAULT_TENANT_ID!`:
- `api/admin/invoices/route.ts`
- `api/admin/leads/route.ts`
- `api/admin/partners/route.ts`
- `api/admin/service-requests/route.ts`
- `api/admin/users/route.ts`
- `api/admin/saved-filters/route.ts`
- `(dashboard)/settings/users/page.tsx`

**Issue:** The `!` non-null assertion means a missing env var causes a runtime crash, not a clear error. Also, single-tenant assumption won't scale.  
**Fix:** For MVP launch: validate `DEFAULT_TENANT_ID` at startup (e.g., in `instrumentation.ts`). For multi-tenant: resolve from admin user's team membership.

---

## 4. API Completeness

### P0 — Lead Edit/Update API (Admin)

**Status:** Missing  
**Location:** Only `POST` exists at `api/admin/leads/route.ts` — no `PUT` or `PATCH`  
**Issue:** Admin can create leads but cannot edit them. Lead detail page has no edit capability.  
**Fix:** Add `PATCH /api/admin/leads/[id]` with role-based access.

### P0 — Service Request Status Transition API

**Status:** Missing  
**Location:** `api/admin/service-requests/route.ts` has `POST` only  
**Issue:** No API to transition service requests through `pending → in_progress → completed → cancelled`. Admin has no way to update SR status.  
**Fix:** Add `PATCH /api/admin/service-requests/[id]/status` with valid transition rules.

### P0 — Invoice Status Workflow API

**Status:** Missing  
**Location:** `api/admin/invoices/route.ts` has `GET` and `POST` only  
**Issue:** No API to mark invoices as sent, paid, overdue, voided, or cancelled.  
**Fix:** Add `PATCH /api/admin/invoices/[id]/status` with transition rules.

### P1 — Partner Lifecycle Status API

**Status:** Partially exists  
**Location:** `api/admin/partners/lifecycle/route.ts` handles some transitions. `approve` and `reject` are separate routes.  
**Issue:** Full lifecycle (pending → approved → contract_sent → contract_signed → meeting_done → onboarded → nurturing → activated) needs a unified state machine with validation.  
**Fix:** Consolidate into a single lifecycle endpoint with a validated status transition map.

### P1 — Commission Dispute API

**Status:** Missing  
**Location:** Schema supports `disputed` status but no endpoint to dispute a commission  
**Fix:** Add `POST /api/commissions/[id]/dispute` (partner) and `PATCH /api/admin/commissions/[id]/resolve` (admin).

### P1 — Payout Request API

**Status:** Missing  
**Location:** `packages/db/src/schema/commissions.ts` — `payoutRequests` table defined but no API  
**Fix:** Add `POST /api/commissions/payout-request` (partner creates) and `PATCH /api/admin/payouts/[id]/process` (finance approves).

### P2 — Bulk Operations

**Status:** Not implemented  
**Issue:** No bulk import/export for partners, leads, or invoices.  
**Fix:** Add CSV import endpoints with validation and preview step.

### P2 — Document Management API

**Status:** Partial — upload exists via WorkDrive integration  
**Issue:** No list/download/delete endpoints for partner or lead documents.  
**Fix:** Add CRUD endpoints for documents tied to partner/lead/service-request.

---

## 5. Missing UI Pages / Features

### P0 — Lead Detail Page (Partner Portal)

**Status:** Missing  
**Issue:** Partners can submit leads and see the list, but there is no lead detail page to track progress.  
**Fix:** Add `apps/partner/src/app/dashboard/leads/[id]/page.tsx`.

### P0 — Invoice View (Partner Portal)

**Status:** Missing  
**Issue:** Partners have no way to view their invoices. The sidebar nav doesn't include an invoices link.  
**Fix:** Add `apps/partner/src/app/dashboard/invoices/page.tsx` with list and detail views.

### P1 — Notification Center

**Status:** Schema exists (`notifications` table), UI missing  
**Location:** `packages/db/src/schema/documents.ts` — `notifications` table  
**Issue:** In-app notifications are stored in the DB but never displayed to users.  
**Fix:** Add a notification bell icon in sidebar header with unread count and dropdown.

### P1 — Service Request Detail Page (Admin)

**Status:** Missing  
**Issue:** Admin can list service requests but there's no detail/edit page for individual SRs.  
**Fix:** Add `apps/admin/src/app/(dashboard)/service-requests/[id]/page.tsx`.

### P1 — Lead Edit Form (Admin)

**Status:** Missing  
**Issue:** Admin lead detail page shows data but has no edit capability (and no edit API — see Section 4).  
**Fix:** Add edit form on the lead detail page with inline editing or a modal.

### P2 — API Key Management UI

**Status:** Schema exists, no UI  
**Fix:** Add settings page for partners to generate/revoke API keys.

### P2 — Webhook Management UI

**Status:** Schema exists, no UI  
**Fix:** Add settings page for webhook configuration.

### P2 — Commission Calculator / Simulator

**Status:** Engine exists in `packages/commission-engine/`  
**Issue:** No UI for admins to simulate commission calculations or for partners to estimate earnings.  
**Fix:** Add a calculator widget on the commissions page.

---

## 6. Data Integrity & Validation

### P0 — Zod Schema Mismatch with DB Schema

**Status:** Bug  
**Location:** `packages/types/src/partner.ts` vs `packages/db/src/schema/partners.ts`  
**Issue:** DB schema has `suspensionReason`, `deletedAt`, `meetingCompletedAt`, `nurturingStartedAt`, and ~15 other fields that are NOT in the TypeScript types. Forms and APIs may silently drop or ignore these fields.  
**Fix:** Generate Zod schemas from Drizzle schema (use `drizzle-zod`) or manually sync. Create a shared validation layer.

### P1 — Soft Deletes Not Enforced in Queries

**Status:** Bug  
**Location:** `partners.deletedAt`, `leads.deletedAt`, `serviceRequests.deletedAt`, `invoices.deletedAt` — all defined but never filtered  
**Issue:** If a record is soft-deleted (e.g., `deletedAt` set), it still appears in all list queries.  
**Fix:** Add `isNull(table.deletedAt)` filter to all SELECT queries, or create a reusable `withoutDeleted` helper.

### P1 — Commission Engine Edge Cases

**Status:** Not handled  
**Location:** `packages/commission-engine/src/index.ts`  
**Issues:**
1. **Negative service fee:** `calculateCommission({ serviceFee: -500, ... })` returns negative commission
2. **NaN/undefined config:** No validation that `config.pct` is a number
3. **Unsorted tiers:** `tiered` mode uses `Array.find()` — if tiers overlap or aren't sorted, first match wins
4. **Zero boundary:** Tier with `min: 0, max: 0` matches zero conversions but not one

**Fix:** Add input validation at the top of `calculateCommission()`:
- Reject negative `serviceFee`
- Validate config shape with Zod
- Sort tiers by `min` ascending and validate no overlap

### P1 — JSON Fields Stored as Text

**Status:** Design concern  
**Location:** Multiple tables use `text` columns for JSON data:
- `partners.commissionRate` — stores JSON
- `leads.serviceInterest` — stores JSON array as text
- `services.requiredDocuments` — stores JSON array as text
- `teamMembers.permissions` — stores JSON object as text

**Issue:** No DB-level validation of JSON structure.  
**Fix:** Either use `jsonb` column type (already available in Drizzle — used in `tenants.brandingConfig`) or validate with Zod on write.

### P2 — Invoice Number Generation

**Status:** Uses `FIN-{timestamp}-{random}` pattern  
**Issue:** Not sequential or predictable. May cause gaps. Consider a DB sequence or counter table for production-grade invoice numbering.

---

## 7. External Integrations

### P0 — Zoho CRM Sync on Lead Creation (Partner Portal)

**Status:** Not implemented  
**Location:** `apps/partner/src/app/api/leads/route.ts`  
**Issue:** Partner-submitted leads are only saved to the local DB. They are NOT synced to Zoho CRM, even though `createZohoLead()` exists in `packages/zoho/src/crm.ts`.  
**Fix:** Call `createZohoLead()` after DB insert and store the returned `zohoLeadId`.

### P0 — Zoho CRM Sync on Admin Lead Creation

**Status:** Not implemented  
**Location:** `apps/admin/src/app/api/admin/leads/route.ts`  
**Issue:** Same as above — admin-created leads are not synced to Zoho CRM.

### P1 — Zoho Sign Contract Integration

**Status:** Not implemented  
**Location:** `partners.zohoSignRequestId` column exists but no integration code  
**Issue:** Contract sending is simulated (status is set to `sent` manually). No actual e-signature workflow.  
**Fix:** Integrate Zoho Sign API for:
1. Creating a sign request from a template
2. Receiving a webhook callback when signed
3. Storing the signed document URL

### P1 — SendGrid Email Retry / Error Handling

**Status:** Errors are caught and logged, not retried  
**Location:** `packages/notifications/src/index.ts`  
**Issue:** If `sendWelcomeEmail()` or `sendPartnerApplicationReceivedEmail()` fails, there's no retry. The main operation (partner approval) succeeds but the email is lost.  
**Fix:** Use a queue (e.g., BullMQ, Inngest, or Trigger.dev) for email delivery with retry.

### P1 — Zoho WorkDrive Token Refresh

**Status:** Uses static access token  
**Location:** `packages/zoho/src/workdrive.ts` — `getWorkdriveToken()` reads `ZOHO_WORKDRIVE_ACCESS_TOKEN`  
**Issue:** Access tokens expire (~60 min). Unlike `crm.ts` which has refresh token logic, WorkDrive uses a static token.  
**Fix:** Implement OAuth2 refresh flow for WorkDrive similar to CRM.

### P2 — Stripe Integration

**Status:** Not implemented  
**Location:** Schema has `stripeTransferId`, `stripeInvoiceId`, `stripePayoutId`, `stripePayoutId` — all unused  
**Issue:** Payment processing is fully placeholder.  
**Fix:** Integrate Stripe Connect for partner payouts and Stripe Invoicing for client invoices.

### P2 — Zoho CRM Two-Way Sync

**Status:** One-way only (portal → CRM)  
**Issue:** Changes made in Zoho CRM are not reflected back in the portal.  
**Fix:** Set up Zoho webhook notifications or periodic polling for relevant module updates.

---

## 8. Performance & Scalability

### P1 — No Pagination on Commission Endpoints

**Status:** Bug  
**Location:** `apps/partner/src/app/api/commissions/route.ts`, admin commissions page  
**Issue:** All commissions are fetched in a single query with no `LIMIT`/`OFFSET`. Will degrade with volume.  
**Fix:** Add `page` and `pageSize` query parameters with default limit of 25.

### P1 — No Pagination on Activity Logs

**Status:** Bug  
**Location:** `packages/db/src/activity.ts` — `getRecentActivity()`  
**Issue:** Fetches up to 50 recent activities. As volume grows, the query gets slower.  
**Fix:** Add cursor-based pagination for the activity timeline.

### P1 — N+1 Query Risk on Partner Detail Page

**Status:** Potential issue  
**Location:** Admin partner detail page loads partner + leads + SRs + commissions in separate queries  
**Issue:** Could be optimized with a single query using JOINs or parallel Promise.all().  
**Fix:** Use `Promise.all()` for parallel DB queries (may already be done — verify).

### P2 — No Database Indexes Beyond Primary Keys

**Status:** Not verified in migrations  
**Location:** `packages/db/drizzle/` — migration files  
**Issue:** Frequently queried columns (e.g., `leads.partnerId`, `leads.status`, `commissions.partnerId`, `partners.tenantId`) may lack indexes.  
**Fix:** Add composite indexes on:
- `leads(tenant_id, partner_id, status)`
- `commissions(tenant_id, partner_id, status)`
- `service_requests(tenant_id, partner_id, status)`
- `partners(tenant_id, status)`

### P2 — No Caching Layer

**Status:** Not implemented  
**Issue:** Frequently accessed data (services list, commission models) is fetched from DB on every request.  
**Fix:** Use `unstable_cache` (Next.js) or Redis for read-heavy endpoints.

---

## 9. Infrastructure & DevOps

### P0 — Environment Variable Validation

**Status:** No startup validation  
**Issue:** Missing env vars cause runtime errors deep in API calls (e.g., `process.env.DEFAULT_TENANT_ID!` crashes if unset).  
**Fix:** Add a shared env validation module using `zod` or `@t3-oss/env-nextjs`:
```
Required: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, DEFAULT_TENANT_ID
Optional: SUPABASE_SECRET_KEY, ZOHO_*, SENDGRID_*, STRIPE_*
```

### P0 — No Database Migrations in CI/CD

**Status:** Migrations exist but no automated deployment  
**Location:** `packages/db/drizzle/` — 3 migration files  
**Issue:** No `drizzle-kit migrate` in deployment pipeline.  
**Fix:** Add `drizzle-kit migrate` to deployment scripts. Verify `drizzle.config.ts` points to production DB URL.

### P1 — Dev Scripts Are macOS-Only

**Status:** Compatibility issue  
**Location:** `scripts/dev.mjs`, `scripts/start-next-dev.mjs`  
**Issue:** Uses `lsof -t -i:PORT` to kill existing processes — doesn't work on Windows or some Linux distros.  
**Fix:** Use cross-platform alternatives (`kill-port` package or `npx kill-port`).

### P1 — No Health Check Endpoint

**Status:** Missing  
**Issue:** No `/api/health` endpoint for monitoring/load-balancers to check app status.  
**Fix:** Add a simple health check route that verifies DB connectivity.

### P1 — No Error Monitoring

**Status:** Not configured  
**Issue:** No Sentry, LogRocket, or similar error tracking. Production errors will be invisible.  
**Fix:** Add Sentry integration to both Next.js apps.

### P2 — No CI/CD Pipeline Configuration

**Status:** No GitHub Actions, Vercel config, or Docker files found  
**Fix:** Add:
- `.github/workflows/ci.yml` — lint, typecheck, build
- `vercel.json` — project linking for monorepo deployment
- Or `Dockerfile` for self-hosted deployment

### P2 — No Test Suite

**Status:** Zero tests  
**Issue:** No unit tests, integration tests, or E2E tests exist.  
**Fix:** Priority test targets:
1. Commission engine (`packages/commission-engine`) — pure logic, easy to test
2. API route handlers — test auth, validation, DB operations
3. E2E flows — registration, lead submission, approval workflow

---

## 10. UX Polish

### P1 — Loading States on Form Submissions

**Status:** Mostly implemented with `isSubmitting` state  
**Issue:** Some forms may lack loading indicators during API calls.

### P1 — Success/Error Toast Messages

**Status:** Implemented via `sonner` Toaster  
**Issue:** Verify all mutating operations show feedback.

### P1 — Mobile Responsiveness

**Status:** Partially implemented  
**Issue:** Sidebar nav has mobile drawer. Verify all table layouts are responsive (horizontal scroll).

### P2 — Dialog Accessibility

**Status:** Uses custom dialog component  
**Location:** `packages/ui/src/dialog.tsx`  
**Issue:** Verify focus trapping, keyboard navigation (Escape to close), and screen reader announcements.

### P2 — Empty States

**Status:** Partially implemented  
**Issue:** Some pages (commissions, invoices) may lack helpful empty states with call-to-action.

### P2 — Date/Time Formatting

**Status:** Uses `toLocaleDateString('en-AE')` consistently  
**Issue:** Good. Verify timezone handling for timestamp displays.

---

## 11. Documentation & Onboarding

### P1 — API Documentation

**Status:** No OpenAPI/Swagger docs  
**Fix:** Generate API docs from route definitions, or maintain a manual API reference.

### P1 — Database Schema Documentation

**Status:** Schema is well-structured in code but not documented externally  
**Fix:** Generate ERD diagram from Drizzle schema.

### P2 — Developer Onboarding Guide

**Status:** README exists with basic setup  
**Fix:** Expand README with:
- Architecture overview
- Package dependency graph
- Local development setup (detailed)
- Environment variable guide with descriptions

---

## 12. Summary Scoreboard

| Priority | Category                   | Items | Key Blockers |
|----------|----------------------------|-------|-------------|
| **P0**   | Security                   | 3     | Rate limiting, API key hashing |
| **P0**   | Auth & RBAC                | 2     | Approve/reject lacks role check, placeholder clerkUserId |
| **P0**   | Multi-Tenancy              | 2     | Hard-coded tenant IDs |
| **P0**   | API Completeness           | 3     | Lead edit, SR status, invoice status |
| **P0**   | Missing UI                 | 2     | Lead detail (partner), invoice view (partner) |
| **P0**   | Data Integrity             | 1     | Zod/DB schema mismatch |
| **P0**   | External Integrations      | 2     | Zoho CRM sync on lead creation |
| **P0**   | Infrastructure             | 2     | Env validation, DB migrations in CI |
| **P1**   | Various                    | 20    | Soft deletes, commission edge cases, email retry, pagination, etc. |
| **P2**   | Nice-to-have               | 14    | Stripe, tests, bulk ops, caching, API docs, etc. |

### Total: 15 P0 items, 20 P1 items, 14 P2 items

---

## Quick-Win Fixes (< 1 hour each)

1. **Add RBAC to approve/reject routes** — Copy role check pattern from `partners/[id]/route.ts` PUT handler
2. **Replace hard-coded tenant ID** in `register/route.ts` with `process.env.DEFAULT_TENANT_ID`
3. **Add `isNull(deletedAt)` filters** to all list queries
4. **Add Zoho CRM sync** to partner lead submission (call `createZohoLead()`)
5. **Add env validation** using zod at app startup
6. **Add pagination params** to commissions endpoint
7. **Add commission input validation** (reject negative fees, validate config shape)

---

## Pre-Launch Checklist

- [ ] All P0 security items resolved
- [ ] RBAC enforced on all admin API routes
- [ ] `DEFAULT_TENANT_ID` env var set and validated
- [ ] Zoho CRM credentials configured and tested
- [ ] SendGrid API key configured and verified
- [ ] Supabase Auth keys configured
- [ ] Database migrations applied to production
- [ ] DNS/domains configured for both apps
- [ ] SSL certificates active
- [ ] Error monitoring (Sentry) configured
- [ ] Backup strategy for Supabase Postgres confirmed
- [ ] First admin user created in `team_members` table
- [ ] Commission models seeded in production DB
- [ ] Services catalog seeded in production DB
- [ ] Health check endpoint added and monitored
