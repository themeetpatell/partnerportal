# Finanshels Partner Portal — Design Specification

**Date:** 2026-03-24
**Status:** Approved
**Scope:** Full 3-phase delivery (Months 1–9)

---

## 1. Problem Statement

Finanshels's partner operations are constrained by:

- Manual tracking of partner-sourced leads and deals
- Complex, manual commission calculations causing payment delays
- No visibility for partners into deal status and earnings
- No visibility for partners into service request status for their customers
- Inability to integrate with partner platforms for white-label services

**Key business impact:** limited partner network scalability, partner dissatisfaction, high operational costs, delayed payments, and competitive disadvantage in white-label services.

---

## 2. Solution Overview

A unified **Partner & Team Portal** that:

1. Automates partner onboarding and management
2. Tracks leads, deals, and services through their full lifecycle
3. Calculates and processes partner commissions automatically
4. Automates document collection and customer onboarding
5. Provides a REST API and webhook system for white-label integrations
6. Supports multi-tenancy from day one for future freezone white-labeling

---

## 3. Users & Roles

### Partner-Facing Roles

| Role | Description |
|------|-------------|
| **Referral Partner** | Self-registers; submits leads; earns commission on conversions |
| **Channel Partner** | Onboarded by admin; submits service requests; receives/pays invoices |

### Internal Team Roles

| Role | Access |
|------|--------|
| **Admin** | Full access — partner management, settings, analytics, all modules |
| **Sales** | Lead queue, lead pipeline, assigned partner visibility (partners assigned to them) |
| **Operations** | Service fulfillment queue, document review, status updates |
| **Finance** | Commission approvals, payout processing, invoice management |

---

## 4. Architecture

### Approach: Turborepo Monorepo

Two independent Next.js 16 apps sharing common packages. Chosen because Phase 3 white-labeling adds a third app (`apps/whitelabel`) with zero duplication of business logic.

The public REST API (`apps/api`) uses Next.js Route Handlers. This is intentional for Phase 2: it shares `packages/db`, `packages/auth`, and `packages/types` with zero duplication, and the Vercel Fluid Compute model (shared instances, reduced cold starts) brings it within the 300ms p95 SLA target. If throughput demands exceed Route Handler capacity in Phase 3, `apps/api` can be replaced with a dedicated Node.js/Hono service without touching shared packages.

```
finanshels-partner-portal/
├── apps/
│   ├── partner/          ← partner.finanshels.com (Next.js 16)
│   ├── admin/            ← admin.finanshels.com (Next.js 16)
│   └── api/              ← api.finanshels.com/v1 (Next.js 16 Route Handlers)
└── packages/
    ├── db/               ← Drizzle ORM schema + Neon Postgres client
    ├── types/            ← Shared TypeScript types + Zod schemas
    ├── ui/               ← Shared shadcn/ui component library
    ├── commission-engine/← Pure TS commission calculation logic (no DB calls)
    ├── zoho/             ← Zoho CRM + WorkDrive API wrappers + queue
    ├── notifications/    ← SendGrid email templates + helpers
    └── auth/             ← Clerk helpers + RBAC middleware
```

### Tech Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Framework | Next.js 16 + TypeScript | App Router, Server Components, Server Actions |
| Database | Neon Postgres + Drizzle ORM | Serverless Postgres, type-safe queries, branching |
| Auth | Clerk | Org-based RBAC, partner invitations, SSO-ready |
| UI | shadcn/ui + Tailwind CSS | Shared design system across both portals |
| CRM | Zoho CRM API | Bidirectional lead & deal sync |
| Documents | Zoho WorkDrive API | Centralised doc storage in Zoho ecosystem |
| Payments | Stripe (Connect + Invoicing) | Payouts, invoicing, UAE VAT via Stripe Tax |
| Email | SendGrid | Transactional emails with Dynamic Templates |
| Queue | Upstash Redis (rate-limit queue) | Persistent across serverless invocations |
| Monorepo | Turborepo | Shared packages, incremental builds, remote cache |
| Deployment | Vercel | Auto-deploy per app, preview URLs, Fluid Compute |

---

## 5. Data Model

### Multi-Tenancy Strategy

Every table carries a `tenant_id`. Drizzle enforces tenant scoping at the query layer. Neon Row-Level Security (RLS) provides defence-in-depth:

```sql
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON partners
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### Core Tables

#### `tenants`
```
id, name, slug (unique), custom_domain,
branding_config (JSON: { logo_url, primary_color, accent_color }),
plan, is_active, created_at
```

#### `partners`
```
id, tenant_id, clerk_user_id,
type (referral|channel),
company_name, contact_name, email, phone,
status (pending|approved|rejected|suspended),
commission_model_id (FK — assigned by admin, not self-selected),
zoho_contact_id,
stripe_account_id (Stripe Connect account ID, referral partners only),
billing_cycle (weekly|monthly — channel partners only; default: monthly; NOT NULL with default),
onboarded_at
```

**Commission model assignment:** Admins assign a commission model to each partner. During self-registration, referral partners see a read-only description of available models but do not choose one — the admin assigns the model on approval. This prevents partners from self-selecting the most favourable terms.

**Suspension behaviour:** A suspended partner loses access to all portal functionality (Clerk session invalidated, middleware blocks). They retain read-only access to their historical commissions, invoices, and statements via a dedicated `/account/suspended` page. Suspension does not affect already-approved or already-paid commissions.

#### `commission_models`
```
id, tenant_id, name,
type (flat_pct|tiered|milestone),
config (JSON — validated via Zod schema on write),
is_active
```

**Config Zod schemas** (enforced in `packages/types`):
```typescript
FlatPctConfig:  { pct: number (0–100) }
TieredConfig:   { tiers: Array<{ min: number, max: number|null, pct: number }>, period: "monthly"|"quarterly" }
MilestoneConfig:{ milestones: Array<{ target: number, reward: number }>, currency: string }
```

All config writes (admin UI + API) validate against these schemas before persisting. Invalid configs are rejected with a typed error.

#### `leads`
```
id, tenant_id, partner_id,
customer_name, customer_email, customer_phone,
service_interest (text[]), notes,
status (submitted|in_review|qualified|proposal_sent|converted|rejected),
zoho_lead_id, zoho_deal_id,
assigned_to (team_member id — maps to portal team member),
idempotency_key (unique — partner_id + customer_email hash, prevents duplicate submissions),
converted_at, created_at
```

**Duplicate lead handling:** On submission, a unique `idempotency_key` is computed as `sha256(tenant_id + partner_id + customer_email)`. If the key already exists with status not `rejected`, the submission is rejected with error `LEAD_ALREADY_EXISTS` and the existing lead ID is returned so the partner can track the original.

#### `service_requests`
```
id, tenant_id, partner_id, service_id,
customer_company, customer_contact_name, customer_contact_email,
status (pending|in_progress|completed|cancelled),
start_date, completed_at, notes, created_at
```

#### `services`
```
id, tenant_id, name, description, category,
base_price, currency,
required_documents (JSON array of doc type strings),
is_active
```

#### `commissions`
```
id, tenant_id, partner_id,
source_type (lead|service_request), source_id,
amount, currency,
status (calculated|pending|approved|processing|paid|disputed),
breakdown (JSON — calculation detail including model snapshot),
model_snapshot (JSON — full copy of commission_model.config at time of calculation),
idempotency_key (unique — source_type + source_id, prevents double-calculation),
calculated_at, approved_at, paid_at,
stripe_transfer_id
```

**Idempotency:** Commission creation uses `idempotency_key = sha256(source_type + source_id)`. Any concurrent or duplicate trigger (e.g. Zoho webhook + manual conversion firing simultaneously) results in an `INSERT ... ON CONFLICT DO NOTHING`, ensuring exactly one commission record per conversion event.

**Model change mid-cycle:** The `model_snapshot` column stores a full copy of the commission model config at the time of calculation. Changes to a commission model after calculation do not affect existing `calculated` or `pending` commissions — they use the snapshot. The new model applies only to conversions that occur after the change.

#### `invoices`
```
id, tenant_id, partner_id,
invoice_number, period_start, period_end,
subtotal, tax_amount, total, currency,
status (draft|sent|paid|overdue|void),
due_date, paid_at,
stripe_invoice_id, pdf_url
```

#### `documents`
```
id, tenant_id,                       ← tenant_id present, consistent with all tables
owner_type (partner|lead|service_request), owner_id,
document_type, file_name,
zoho_workdrive_id, zoho_workdrive_url,
upload_status (pending|completed|failed),
uploaded_by, uploaded_at
```

**WorkDrive upload failure handling:** Documents are created with `upload_status = pending` before the WorkDrive API call begins. On success, status is set to `completed`. On failure, status is set to `failed` and the upload is queued for retry (3 attempts, exponential backoff via Upstash Redis). Partners see a "Processing..." state for pending documents and an "Upload failed — retry" action for failed ones. Partner onboarding cannot be submitted until all required documents have `upload_status = completed`.

### Supporting Tables

| Table | Purpose |
|-------|---------|
| `team_members` | Internal users: `tenant_id`, `clerk_user_id`, `zoho_user_id` (for Zoho owner mapping), `role`, `name`, `email` |
| `notifications` | In-app alerts: `tenant_id`, `partner_id`, `type`, `title`, `body`, `is_read` |
| `audit_logs` | Compliance trail: `actor_id`, `action`, `entity_type`, `entity_id`, `diff` (JSON), `ip` |
| `api_keys` | Partner API keys: `tenant_id`, `partner_id`, `key_hash`, `scopes` (JSON), `last_used_at` |
| `webhooks` | Partner webhooks: `tenant_id`, `partner_id`, `url`, `events` (JSON), `secret_hash` |
| `payout_requests` | Referral payout requests: `tenant_id`, `partner_id`, `amount`, `status`, `stripe_payout_id` |
| `webhook_deliveries` | Delivery log: `webhook_id`, `event`, `payload`, `status`, `attempts`, `next_retry_at` |
| `tenant_secrets` | Encrypted integration credentials: `tenant_id`, `key_name`, `encrypted_value` |
| `milestone_awards` | Awarded milestone bonuses: `tenant_id`, `partner_id`, `model_id`, `milestone_target`, `awarded_at` — unique constraint on `(tenant_id, partner_id, model_id, milestone_target)` prevents double-awarding |

### Secrets Encryption

Integration credentials (Zoho OAuth tokens, Stripe keys, SendGrid API key) are stored in `tenant_secrets` encrypted with AES-256-GCM. The encryption key is a single `TENANT_SECRETS_KEY` environment variable set at the Vercel project level (not per-tenant). Key rotation: re-encrypt all rows with the new key before removing the old one. This key is the only secret that lives in environment variables.

---

## 6. Partner Portal (`apps/partner`)

**URL:** `partner.finanshels.com`

### Navigation (Role-Aware)

**Referral Partner:** Dashboard · Submit Lead · My Leads · Commissions · Payouts · Notifications · Profile & Docs · Resources

**Channel Partner:** Dashboard · New Service Request · Service Requests · Commissions · Invoices · Notifications · API Access · Profile & Docs

### Pages

#### `/register` — Multi-Step Onboarding
1. Partner type selection (Referral / Channel)
2. Company & contact details
3. Document upload → Zoho WorkDrive (all required docs must reach `upload_status = completed` before proceeding)
4. Read-only display of available commission model(s) with descriptions — for information only, admin assigns the model on approval
5. Terms & Conditions acceptance + submit

Referral partners: status = `pending` → admin reviews → on approval, admin assigns commission model → partner gets welcome email with login link.
Channel partners: status = `pending` → manual admin review → same approval flow.

#### `/dashboard` — Home
KPI cards (leads/requests, pending commission, paid commission), recent activity feed, quick actions, notifications panel, upcoming payment dates.

#### `/leads/new` — Lead Submission (Referral only)
Customer name, email, phone, service interest (multi-select from catalog), notes, optional document upload. On submit: idempotency check → creates lead record + pushes to Zoho CRM as Lead.

#### `/leads` — Lead Tracker (Referral only)
Filterable table with status badges: Submitted → In Review → Qualified → Converted → Rejected. Click row → lead detail with full timeline. Export CSV.

#### `/service-requests/new` — Service Request (Channel only)
Service catalog browser, customer company & contact, service start date, required document upload per service. On submit: creates service request, uploads docs to WorkDrive (with retry on failure).

#### `/service-requests` — Request Tracker (Channel only)
Status: Pending → In Progress → Completed. Click row → detail with status timeline and uploaded documents.

#### `/commissions` — Commission Dashboard
Total earned / pending / paid summary cards. Breakdown table by source. Commission model explanation (admin-assigned model shown read-only). Milestone progress tracker (if applicable — Phase 2). Request payout button (Referral — Phase 2).

**Phase 1 note:** Only flat % commission model is supported. Dashboard shows calculated commissions based on flat % only.

#### `/payouts` — Payout Management (Referral only, Phase 2)
Payout request history. Status: Pending → Processing → Paid. Stripe Connect onboarding prompt if not connected. Download commission statements.

#### `/invoices` — Invoice Management (Channel only, Phase 2)
Invoice list with status (Draft / Sent / Paid / Overdue). Click → invoice detail + PDF download. Embedded Stripe checkout for payment. Tax invoice download.

#### `/notifications` — Notification Centre
All in-app notifications with read/unread state. Filter by type.

#### `/api-access` — API Management (Channel only, Phase 2)
Generate & manage API keys with scope selection. Configure webhook endpoints + event subscriptions. API usage stats. Link to API documentation. Webhook delivery logs.

#### `/profile` — Profile & Documents
Update contact details. View/re-upload compliance documents. View commission model assigned (read-only).

#### `/account/suspended` — Suspended Account View
Read-only access to historical commissions, invoices, and downloadable statements. No new submissions possible. Contact support CTA.

---

## 7. Admin Portal (`apps/admin`)

**URL:** `admin.finanshels.com`

### Role-Based Navigation

| Admin | Sales | Operations | Finance |
|-------|-------|------------|---------|
| Overview Dashboard | My Dashboard | Ops Dashboard | Finance Dashboard |
| Partner Management | Lead Queue | Service Queue | Commissions |
| Team Members | Lead Pipeline | In-Progress | Invoices |
| Tenant Settings | Assigned Partners | Completed | Payout Queue |
| Commission Models | Conversion Reports | Document Review | Reconciliation |
| Service Catalog | | SLA Reports | Financial Reports |
| Analytics | | | |
| Integrations | | | |
| Audit Logs | | | |

**Sales "Assigned Partners":** Sales reps can view only the partners assigned to them (`leads.assigned_to` = their `team_member.id`), not all partners.

### Key Pages

#### `/` — Overview Dashboard (Admin)
KPIs: active partners, pending approvals, open leads, conversion rate, commissions due, overdue invoices. Partner growth chart. Lead funnel. Recent activity stream.

#### `/partners` — Partner Management (Admin)
Filterable table (type, status, date). Tabs: All / Pending / Approved / Rejected / Suspended.
- Pending tab: Approve (+ assign commission model) / Reject (+ reason) / Request Additional Docs (sends email)
- Partner detail: profile, documents (WorkDrive preview), leads/requests, commission history
- Edit commission model assignment (takes effect on next conversion; existing pending commissions use their snapshot)
- Manual channel partner creation (admin sets billing cycle: weekly or monthly)
- Suspend / reactivate (reactivation restores full portal access)

#### `/leads` — Lead Queue (Sales)
Kanban or table view. Columns: Submitted → In Review → Qualified → Proposal Sent → Converted / Rejected.
- Assign lead to sales rep
- Lead detail: customer info, docs, partner info, notes, full status timeline
- One-click "Convert to Zoho Deal" (creates Zoho Deal, stores `zoho_deal_id`) — uses idempotent DB write to guard against concurrent Zoho webhook
- Add internal notes
- Request more info from partner (sends email + in-app notification)

#### Lead Status Flow
```
Submitted → In Review → Qualified → Proposal Sent → Converted ✓
                                                   → Rejected  ✗
```
Zoho CRM webhook on "Closed Won" also auto-triggers Converted status. Both paths write to `commissions` with `INSERT ... ON CONFLICT DO NOTHING` on `idempotency_key` — only one commission record is ever created per lead.

**Zoho user → portal team member mapping:** `team_members.zoho_user_id` stores the corresponding Zoho user ID for each portal team member. When a Zoho "lead owner changed" webhook fires, the system looks up `zoho_user_id` in `team_members` to find the matching portal user and updates `leads.assigned_to`. If no match is found, the webhook is logged and the lead owner is unchanged (no silent failure).

#### `/service-requests` — Service Queue (Operations)
Filterable list. Assign to ops team member. Update status with notes. View/download documents from WorkDrive (signed URL, 1hr expiry). Request additional documents from partner. Mark complete → triggers commission calculation (idempotent via `commissions.idempotency_key`).

#### `/commissions` — Commission Management (Finance)
Pending commissions list (auto-calculated on conversion/completion). Bulk approve / reject. Payout queue: approve → `stripe.transfers.create()` → mark Processing. Dispute workflow (pauses payout, notifies partner with reason). Commission model editor (Zod-validated config on save).

#### `/invoices` — Invoice Management (Finance)
Auto-generate Stripe Invoices on each partner's configured billing cycle (weekly or monthly — set per channel partner on the partner record). Review draft → Send to partner. Track payment via Stripe webhooks. Send overdue reminders (Day +7, Day +14). PDF generation with UAE VAT (5%) line items.

#### `/analytics` — Analytics (Admin)
Partner performance table (leads submitted, conversion %, total earnings). Commission reports by period / partner / model. Service delivery SLA tracking. Revenue attribution by partner. Export all to CSV / PDF.

#### `/settings` — Settings (Admin)
- Tenant branding (logo, colours, custom domain)
- Commission model CRUD (Zod-validated config)
- Service catalog CRUD (name, price, required docs)
- Team member management + role assignment + Zoho user ID mapping
- Integration configuration (Zoho OAuth flow, Stripe Connect, SendGrid API key) — all stored in `tenant_secrets`
- Notification template editor

---

## 8. Commission Engine (`packages/commission-engine`)

Pure TypeScript package. No database calls. Fully unit-testable. All data required for calculation is passed in by the caller (DB queries happen in the calling Server Action or API route, results are passed into these functions).

### Models

**Phase 1: Flat % only.**
**Phase 2: Tiered + Milestone added.**

**Flat %**
```
commission = service_fee × (pct / 100)
config: { pct: 10 }
```

**Tiered**
```
Tier applied based on partner's conversion count in the rolling period.
Rolling period boundary: calendar-aligned, UTC.
  monthly:   1st of month 00:00 UTC → last day of month 23:59:59 UTC
  quarterly: Q1 = Jan 1 – Mar 31, Q2 = Apr 1 – Jun 30,
             Q3 = Jul 1 – Sep 30, Q4 = Oct 1 – Dec 31 (all 00:00–23:59:59 UTC)
NOT a rolling 30/90-day window — always calendar-aligned.

config: {
  tiers: [
    { min: 0, max: 5, pct: 8 },
    { min: 6, max: 10, pct: 12 },
    { min: 11, max: null, pct: 15 }
  ],
  period: "monthly"
}

Caller's responsibility: query count of converted leads for this partner
in the current calendar period BEFORE this conversion, pass as
partnerConversionsThisPeriod. The engine applies the matching tier.
```

**Milestone**
```
One-time bonus when partner crosses cumulative conversion targets.
config: {
  milestones: [
    { target: 10, reward: 500 },
    { target: 25, reward: 1500 },
    { target: 50, reward: 5000 }
  ],
  currency: "AED"
}
```
Double-award prevention: `milestone_awards` table tracks which milestones have been awarded per partner per model. `getMilestoneBonus` returns bonuses to award, but the caller inserts into `milestone_awards` using `INSERT ... ON CONFLICT DO NOTHING` before disbursing. The engine itself is stateless.

### Package API

```typescript
// All inputs are plain data — caller fetches from DB, passes in.

calculateCommission(params: {
  model: CommissionModel            // validated config from DB
  serviceFee: number
  // Required for tiered models; pass 0 for flat_pct (unused but type-safe).
  partnerConversionsThisPeriod: number
  // Required for milestone models; pass 0 for flat_pct (unused but type-safe).
  partnerLifetimeConversions: number
}) → { amount: number; breakdown: string }

getMilestoneBonus(params: {
  model: CommissionModel
  previousLifetimeConversions: number
  newLifetimeConversions: number
  alreadyAwardedTargets: number[]   // caller queries milestone_awards table
}) → { bonuses: MilestoneBonus[] }  // only returns bonuses NOT in alreadyAwardedTargets

generateCommissionStatement(params: {
  partner: PartnerSummary           // caller fetches from DB
  commissions: Commission[]         // caller passes commissions with status IN
                                    // (approved|processing|paid) for the period
                                    // period boundary is inclusive on both ends
  period: { start: Date; end: Date } // inclusive start, inclusive end (UTC)
}) → CommissionStatement            // pure data object — caller handles PDF rendering
                                    // Phase 2+: PDF rendered server-side, not Phase 1
```

### Commission Lifecycle
```
Calculated → Pending → Approved → Processing → Paid
                     → Disputed (paused, partner notified with reason)
```
Finance always has a manual approval gate before any Stripe transfer fires.

---

## 9. Integrations

### Zoho CRM — Bidirectional Lead Sync

**Portal → Zoho (Push):**
- Lead submission → create Zoho Lead via API, store `zoho_lead_id`
- Lead qualified (admin) → convert to Zoho Deal, store `zoho_deal_id`, set stage = "Proposal"
- Lead converted (admin) → update Zoho Deal stage = "Closed Won"
- Lead rejected (admin) → update Zoho Deal stage = "Closed Lost"

**Zoho → Portal (Webhook):**
- Deal stage "Closed Won" → `INSERT INTO leads SET status = converted WHERE zoho_deal_id = ? ON CONFLICT DO NOTHING` → trigger commission (idempotent)
- Deal stage "Closed Lost" → mark lead Rejected → notify partner
- Lead owner changed → look up `team_members.zoho_user_id`; update `leads.assigned_to` if match found; log and skip if no match

**Auth:** Zoho OAuth 2.0. Refresh tokens stored encrypted in `tenant_secrets`. A background job (Vercel Cron, daily) refreshes tokens before expiry. Concurrent refresh race condition is prevented by an Upstash Redis distributed lock (`SET zoho-refresh:{tenant_id} 1 NX EX 30`): only the lock-holder refreshes and writes the new token; other requestors skip and use the existing token.

**Rate limiting:** Zoho API calls go through `packages/zoho`, which uses an **Upstash Redis** queue (persistent across serverless invocations) to enforce Zoho's 5,000 calls/day limit. Queue constraints: max depth 10,000 items per tenant; max item age 48 hours (items older than 48 hours are dropped and an alert is fired). If the queue depth exceeds 8,000 items, an admin alert email is sent via SendGrid. The queue uses a sliding-window counter keyed by `tenant_id`.

### Zoho WorkDrive — Document Management

**Folder structure:**
```
Partner Portal/
├── Partners/{partner_id}/
│   ├── KYC/
│   └── Agreements/
├── Leads/{lead_id}/
└── ServiceRequests/{request_id}/
```

**Upload flow:**
1. Document record created in DB with `upload_status = pending`
2. Server requests upload URL from WorkDrive API
3. File streamed to WorkDrive
4. On success: `zoho_workdrive_id`, `zoho_workdrive_url` stored; status = `completed`
5. On failure: status = `failed`; retry queued via Upstash Redis (3 attempts: 1m, 5m, 30m)
6. Partner sees "Processing…" for pending, "Upload failed — retry" for failed docs
7. Onboarding form submit is blocked until all required docs are `completed`

**Access:** Partners upload to own folder only. Admin/Ops read all. Downloads via signed URLs (1hr expiry). Delete: admin only.

**Auth:** Zoho OAuth 2.0, same token as CRM (different WorkDrive scope).

### Stripe — Payouts & Invoicing

**Referral partner payouts (Phase 2):**
- Partners onboard via Stripe Connect (Express account); `stripe_account_id` stored on partner record
- Finance approves commission batch → `stripe.transfers.create()` to `stripe_account_id`
- Webhook `transfer.paid` → mark commission Paid, notify partner
- Monthly commission statements downloadable as PDF (generated server-side from `commissions` data)

**Channel partner invoicing (Phase 2):**
- Billing cycle (weekly/monthly) set per partner on the partner record
- Auto-generate Stripe Invoices at start of each billing cycle
- Partner pays via embedded Stripe checkout in portal
- Webhook `invoice.paid` → mark invoice Paid
- Webhook `invoice.payment_failed` → send overdue reminder
- UAE VAT (5%) via Stripe Tax line items on every invoice

### SendGrid — Transactional Email

All templates stored as SendGrid Dynamic Templates. Variables injected server-side. Unsubscribe handled by SendGrid preference centre.

| Trigger | Template |
|---------|----------|
| Partner registered | Registration received |
| Partner approved | Welcome + login link |
| Partner rejected | Rejection with reason |
| Docs requested | Additional documents required |
| Lead received | Lead submission confirmation |
| Lead status changed | Lead status update |
| Lead converted | Commission earned notification |
| Service status updated | Service request update |
| Service completed | Service completed notification |
| Commission approved | Commission approved |
| Payout processed | Payment sent confirmation |
| Invoice issued | Invoice issued (channel) |
| Invoice overdue (D+7) | Payment reminder |
| Invoice overdue (D+14) | Final payment reminder |

---

## 10. Public REST API (`apps/api`)

**Base URL:** `api.finanshels.com/v1`
**Auth:** `X-API-Key: sk_live_...` (scoped per partner + per tenant; stored as bcrypt hash, plain key shown only once)
**Scopes:** `leads:read`, `leads:write`, `services:read`, `services:write`, `commissions:read`
**Rate limit:** 1,000 requests/hour per key

### Endpoints

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| POST | `/leads` | `leads:write` | Submit a new lead |
| GET | `/leads` | `leads:read` | List partner's leads (paginated) |
| GET | `/leads/{id}` | `leads:read` | Get lead status & details |
| POST | `/service-requests` | `services:write` | Submit a service request |
| GET | `/service-requests` | `services:read` | List partner's service requests (paginated) |
| GET | `/service-requests/{id}` | `services:read` | Get service request status |
| GET | `/commissions` | `commissions:read` | List commissions earned |
| GET | `/commissions/summary` | `commissions:read` | Total earned, pending, paid |
| GET | `/services` | `services:read` | Service catalog |
| POST | `/webhooks` | any valid API key | Register a webhook endpoint (any authenticated partner can register webhooks; webhooks receive only events scoped to that partner) |
| DELETE | `/webhooks/{id}` | any valid API key | Remove a webhook (partner can only delete their own webhooks) |

**Response envelope:**
```json
{ "data": {}, "meta": { "page": 1, "total": 42 } }
{ "error": { "code": "LEAD_NOT_FOUND", "message": "...", "details": {} } }
```

### Webhook Events

| Category | Events |
|----------|--------|
| Leads | `lead.submitted`, `lead.in_review`, `lead.qualified`, `lead.converted`, `lead.rejected` |
| Services | `service.received`, `service.in_progress`, `service.completed`, `service.doc_requested` |
| Finance | `commission.earned`, `commission.paid`, `invoice.issued`, `invoice.paid`, `invoice.overdue` |

**Delivery:** HTTPS POST with `X-Finanshels-Signature` header (HMAC-SHA256 of `timestamp.payload` using per-webhook secret).

**Replay protection:** Webhook payload includes `{ event, timestamp, data }`. Receivers should reject payloads where `timestamp` is older than 5 minutes. The signature covers the timestamp, making replayed requests with stale timestamps invalid.

**Retry:** 3 attempts with exponential backoff (1m, 5m, 30m). Delivery history stored in `webhook_deliveries`. Delivery logs visible in partner portal API Access page.

---

## 11. Phase Delivery Plan

### Phase 1 — Core Partner Management (Months 1–3)

**Goal:** Referral partner self-service + lead management + flat % commission visibility.

| Area | Deliverables |
|------|-------------|
| Infrastructure | Turborepo monorepo, Neon Postgres + Drizzle schema (full multi-tenant), Clerk auth + RBAC, Vercel deployments, Upstash Redis setup |
| Partner Portal | Referral partner registration + onboarding (flat % model), document upload to WorkDrive (with retry), lead submission + tracking, basic commission dashboard (flat % only), profile management, suspended account view |
| Admin Portal | Partner approval workflow + commission model assignment, lead queue (Sales), team member management + Zoho user ID mapping, commission model setup (flat % only), basic analytics |
| Integrations | Zoho CRM lead sync (push + webhook), Zoho WorkDrive document upload, SendGrid onboarding + lead update emails |

### Phase 2 — Advanced Operations (Months 4–6)

**Goal:** Channel partners, service fulfillment, full commission + invoicing system, core API.

| Area | Deliverables |
|------|-------------|
| Infrastructure | Stripe Connect + Invoicing, core REST API (`apps/api`), webhook delivery system, all SendGrid templates, Zoho CRM bidirectional sync complete, Upstash Redis rate-limit queue for Zoho |
| Partner Portal | Channel partner onboarding + billing cycle config, service request submission + tracking, invoice management + Stripe checkout, payout requests, in-app notification centre, API key management |
| Admin Portal | Service queue (Operations), commission approval + payout processing, invoice generation + sending, full analytics suite |
| Commission Engine | Tiered + milestone commission models, milestone_awards deduplication, commission statement PDF generation |

### Phase 3 — White-Label & Integration Platform (Months 7–9)

**Goal:** Freezone multi-tenancy, full API platform, advanced analytics.

| Area | Deliverables |
|------|-------------|
| White-Label | Tenant branding engine (logo, colours, custom domain), freezone instance provisioning, tenant admin dashboard, `apps/whitelabel` added to monorepo |
| API Platform | Full API coverage, developer documentation site, API usage analytics, webhook event browser |
| Advanced | Advanced BI reports + export, workflow customisation engine, Stripe Tax (UAE VAT), SSO for enterprise partners, audit log export |

---

## 12. Security & Compliance

- **Authentication:** Clerk with org-based isolation. Partners can only see their own tenant's data.
- **Authorisation:** RBAC enforced at middleware layer (`packages/auth`) + Neon RLS as defence-in-depth.
- **API Keys:** Stored as bcrypt hashes. Plain key shown only once on creation.
- **Webhook signatures:** HMAC-SHA256 with per-webhook secret. 5-minute timestamp replay window.
- **Documents:** Zoho WorkDrive enforces folder-level permissions. Signed download URLs expire after 1 hour.
- **Audit logs:** All create/update/delete actions on sensitive entities logged with actor, diff, and IP.
- **Secrets:** All integration credentials stored encrypted (AES-256-GCM) in `tenant_secrets` table. Single `TENANT_SECRETS_KEY` env var at Vercel project level. Key rotation: re-encrypt all rows with new key before retiring old one.
- **Data isolation:** Every database query includes `tenant_id` filter. Neon RLS enforces this at the database layer.
- **Commission idempotency:** `commissions.idempotency_key` is `sha256(tenant_id + source_type + source_id)` — tenant_id is included in the hash since `source_id` is a UUID scoped to a tenant (globally unique in practice, but tenant_id is included for defensive correctness). The unique constraint prevents double-calculation from concurrent triggers (manual + Zoho webhook race condition).
- **Milestone idempotency:** `milestone_awards` table with unique constraint on `(tenant_id, partner_id, model_id, milestone_target)` prevents double-awarding.

---

## 13. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Uptime | 99.9% (Vercel SLA) |
| API response time | < 300ms p95 (Vercel Fluid Compute) |
| Webhook delivery | < 30s from event |
| Document upload | Up to 50MB per file |
| Concurrent partners | 10,000+ (Neon scales horizontally) |
| Commission calculation | Real-time on conversion event |
| Invoice generation | Automated on billing cycle, < 5min |
| Zoho API calls | Queued via Upstash Redis; max 5,000/day per Zoho account |

---

## 14. Out of Scope

- Mobile native apps (responsive web covers mobile)
- OCR / automated document data extraction (future consideration)
- In-app messaging / chat (communication via email notifications)
- Partner-to-partner referrals
- Multi-currency commission payouts (AED only in Phase 1–2)
- Self-service commission model selection by partners (admin-assigned only)
