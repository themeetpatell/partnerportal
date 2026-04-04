# Launch-Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all blockers and critical gaps discovered in the end-to-end audit of partner, admin, partnership team, and finance team workflows so the portal is ready to go live.

**Architecture:** Next.js 15.2 App Router (RSC + Client Components), Drizzle ORM on Supabase Postgres, Zoho CRM integration, Clerk auth with team-member RBAC. All changes are targeted surgical fixes — no new abstractions.

**Tech Stack:** Next.js 15.2, Drizzle ORM, Supabase Postgres, Clerk, Zoho CRM, Resend/SendGrid, Zod

---

## Audit Findings Summary

### What's already fine (do not touch)
- Admin dashboard layout (`layout.tsx`) enforces auth + teamMember check — all admin pages are protected from unauthenticated access.
- Commission API routes (`approve`, `reject`, `process`, `paid`) all have auth + role checks.
- `push-to-crm` API route has auth + role checks.
- Lead creation is non-blocking on Zoho (fixed in prior session).
- CRM sync status is visible in both portals (fixed in prior session).

### Real bugs to fix

| # | Severity | Location | Problem |
|---|----------|----------|---------|
| 1 | HIGH | `api/commissions/[id]/approve`, `reject`, `process` | TOCTOU race: reads status then updates in separate queries — two concurrent requests can both see "pending" and both proceed |
| 2 | HIGH | `(dashboard)/analytics/page.tsx` | No `tenantId` filter on partner/lead/commission queries — leaks cross-tenant data |
| 3 | MEDIUM | `api/service-requests/options` | `wonAt` sent as `lead.createdAt` — should be the lead's actual `updatedAt` when status changed to `deal_won` (no `wonAt` column exists; using `updatedAt` is more accurate) |
| 4 | MEDIUM | `(dashboard)/commissions/page.tsx` | No RBAC-based UI: all users see Approve/Reject/Payout buttons regardless of role (APIs are protected, but confusing UX) |
| 5 | MEDIUM | `(dashboard)/analytics/page.tsx` | `auth()` result is fetched but role is never validated — any teamMember (including read-only roles) can see all analytics |
| 6 | LOW | `api/service-requests/route.ts:174` | `serviceId: null` hardcoded — acceptable since `servicesList` stores names, but column should be documented as intentionally nullable |
| 7 | LOW | `(dashboard)/leads/page.tsx` and commissions page | No pagination — will become unusable with large datasets |

---

## Task 1: Fix commission state-transition race conditions

**Files:**
- Modify: `apps/admin/src/app/api/commissions/[id]/approve/route.ts`
- Modify: `apps/admin/src/app/api/commissions/[id]/reject/route.ts`
- Modify: `apps/admin/src/app/api/commissions/[id]/process/route.ts`

The current pattern is:
1. `SELECT` to check status
2. `UPDATE` with only `WHERE id = ?`

If two requests hit simultaneously, both read `pending`, both update. Fix: add the expected status to the UPDATE WHERE clause and check if any row was actually updated.

- [ ] **Step 1: Fix approve route — atomic status guard**

In `apps/admin/src/app/api/commissions/[id]/approve/route.ts`, replace the status check + update block (lines 30–57) with:

```typescript
  const { id } = await params

  // Atomic: only update if still pending — prevents TOCTOU race
  const [updated] = await db
    .update(commissions)
    .set({
      status: "approved",
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(commissions.id, id), eq(commissions.status, "pending")))
    .returning()

  if (!updated) {
    // Either not found or already transitioned
    const [existing] = await db
      .select({ status: commissions.status })
      .from(commissions)
      .where(eq(commissions.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 })
    }
    return NextResponse.json(
      { error: `Commission is already "${existing.status}". Only pending commissions can be approved.` },
      { status: 422 }
    )
  }
```

Also add `and` to the import: `import { eq, and } from "drizzle-orm"`

The rest of the function (logActivity, email) stays the same, just using the `updated` variable.

- [ ] **Step 2: Fix reject route — same atomic pattern**

In `apps/admin/src/app/api/commissions/[id]/reject/route.ts`, replace lines 27–55 with:

```typescript
  const { id } = await params

  const [updated] = await db
    .update(commissions)
    .set({
      status: "disputed",
      updatedAt: new Date(),
    })
    .where(and(eq(commissions.id, id), eq(commissions.status, "pending")))
    .returning()

  if (!updated) {
    const [existing] = await db
      .select({ status: commissions.status })
      .from(commissions)
      .where(eq(commissions.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 })
    }
    return NextResponse.json(
      { error: `Commission is already "${existing.status}". Only pending commissions can be rejected.` },
      { status: 422 }
    )
  }
```

Add `and` to the import.

- [ ] **Step 3: Fix process route — same atomic pattern for approved→processing**

In `apps/admin/src/app/api/commissions/[id]/process/route.ts`, replace lines 27–86 with:

```typescript
  const { id } = await params

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(commissions)
      .set({
        status: "processing",
        updatedAt: new Date(),
      })
      .where(and(eq(commissions.id, id), eq(commissions.status, "approved")))
      .returning()

    if (!updated) {
      const [existing] = await tx
        .select({ status: commissions.status })
        .from(commissions)
        .where(eq(commissions.id, id))
        .limit(1)

      if (!existing) {
        throw new Error("NOT_FOUND")
      }
      throw new Error(`WRONG_STATUS:${existing.status}`)
    }

    const [payout] = await tx
      .insert(payoutRequests)
      .values({
        tenantId: updated.tenantId,
        partnerId: updated.partnerId,
        commissionId: updated.id,
        amount: updated.amount,
        currency: updated.currency,
        status: "processing",
      })
      .returning()

    await logActivity({
      tenantId: updated.tenantId,
      entityType: "commission",
      entityId: updated.id,
      actorId: userId,
      actorName,
      action: "payout_started",
      note: `Payout started by ${actorName}`,
      metadata: {
        amount: updated.amount,
        currency: updated.currency,
        payoutRequestId: payout?.id ?? null,
      },
    })
  }).catch((err: Error) => {
    if (err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 })
    }
    if (err.message.startsWith("WRONG_STATUS:")) {
      const currentStatus = err.message.split(":")[1]
      return NextResponse.json(
        { error: `Commission is already "${currentStatus}". Only approved commissions can enter payout processing.` },
        { status: 422 }
      )
    }
    throw err
  })
```

Add `and` to the import.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/app/api/commissions/[id]/approve/route.ts \
        apps/admin/src/app/api/commissions/[id]/reject/route.ts \
        apps/admin/src/app/api/commissions/[id]/process/route.ts
git commit -m "fix: atomic commission state transitions — prevent TOCTOU race on approve/reject/process"
```

---

## Task 2: Fix analytics page tenant isolation

**Files:**
- Modify: `apps/admin/src/app/(dashboard)/analytics/page.tsx`

The analytics page queries partners, leads, commissions, service requests, and invoices without a `tenantId` filter. In a multi-tenant deployment this exposes data across tenants. Fix: pull the tenant ID from env and add it to each condition array.

- [ ] **Step 1: Add tenantId import and condition to analytics page**

At the top of `AnalyticsPage` function body (around line 236), after the `auth()` call, add:

```typescript
  const tenantId = getRequiredTenantId()
```

Also add the import at the top of the file:
```typescript
import { getRequiredTenantId } from "@/lib/env"
```

- [ ] **Step 2: Add tenantId to each condition array**

Find each conditions array and add the tenantId filter:

**`leadConditions`** — add `eq(leads.tenantId, tenantId)` as first item.

**`srConditions`** — add `eq(serviceRequests.tenantId, tenantId)` as first item.

**`invoiceConditions`** — add `eq(invoices.tenantId, tenantId)` as first item.

**`partnerConditions`** — add `eq(partners.tenantId, tenantId)` as first item.

**`commissionConditions`** — add `eq(commissions.tenantId, tenantId)` as first item.

Make sure `eq` is already in the drizzle-orm import (it is).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/(dashboard)/analytics/page.tsx
git commit -m "fix: add tenantId filter to analytics queries — prevent cross-tenant data leak"
```

---

## Task 3: Role-based UI visibility on commissions page

**Files:**
- Modify: `apps/admin/src/app/(dashboard)/commissions/page.tsx`

The Approve / Reject / Payout buttons are visible to all team members, but the APIs reject non-finance roles. This is confusing — a partnership_manager sees buttons that always 403. Fix: read the user's role in the page and only render action buttons for finance/admin roles.

- [ ] **Step 1: Add auth to commissions page**

At the top of the `CommissionsPage` function body, add:

```typescript
  const { userId } = await auth()
  const member = userId ? await getActiveTeamMember(userId) : null
  const canManageCommissions = member
    ? hasAnyTeamRole(member.role, ["super_admin", "admin", "finance"])
    : false
```

Add imports:

```typescript
import { auth } from "@repo/auth/server"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { hasAnyTeamRole } from "@/lib/rbac"
```

- [ ] **Step 2: Gate action buttons on `canManageCommissions`**

Find the section rendering the Approve, Reject, and Process Payout form buttons. Wrap each action form with:

```tsx
{canManageCommissions && (
  <form action={...}>
    ...
  </form>
)}
```

The read-only view (commission list, amounts, status badges) remains visible to all roles.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/(dashboard)/commissions/page.tsx
git commit -m "feat: gate commission action buttons on finance/admin role"
```

---

## Task 4: Fix service request wonAt accuracy

**Files:**
- Modify: `apps/partner/src/app/api/service-requests/options/route.ts`

Currently `wonAt` returns `lead.createdAt` (submission date). This should be the lead's `updatedAt` which is more accurate as it reflects when the lead's status was last changed (to `deal_won`).

- [ ] **Step 1: Switch wonAt to updatedAt**

In `apps/partner/src/app/api/service-requests/options/route.ts`, in the select query for leads, change:

```typescript
// Before
createdAt: leads.createdAt,

// After
wonAt: leads.updatedAt,
```

And in the clientMap loop, change:

```typescript
// Before
wonAt: lead.createdAt,

// After
wonAt: lead.wonAt,
```

Also update the type annotation:

```typescript
// Before
wonAt: Date | null
// (already correct, just rename the field from createdAt)
```

- [ ] **Step 2: Commit**

```bash
git add apps/partner/src/app/api/service-requests/options/route.ts
git commit -m "fix: use lead.updatedAt for wonAt in service request options — more accurate deal date"
```

---

## Task 5: Admin role-based UI for leads and partners pages

**Files:**
- Modify: `apps/admin/src/app/(dashboard)/leads/[id]/page.tsx`
- Modify: `apps/admin/src/app/(dashboard)/partners/[id]/page.tsx`

Partnership managers (SDRs) should not see finance-only actions. The Push to CRM button is fine for all roles (SDRs need it), but status update and commission actions should be gated.

- [ ] **Step 1: Read the current lead detail page auth pattern**

Read `apps/admin/src/app/(dashboard)/leads/[id]/page.tsx` lines 1-50 to see how auth is currently used.

- [ ] **Step 2: Add role-aware rendering to lead detail**

If the page already calls `getActiveTeamMember`, add:

```typescript
const canManageLeads = member
  ? hasAnyTeamRole(member.role, ["super_admin", "admin", "partnership_manager"])
  : false
const canFinance = member
  ? hasAnyTeamRole(member.role, ["super_admin", "admin", "finance"])
  : false
```

Gate the "Update Status" form with `canManageLeads`.
Gate any commission-related actions with `canFinance`.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/(dashboard)/leads/[id]/page.tsx
git commit -m "feat: role-aware lead detail actions — hide finance actions from non-finance roles"
```

---

## Task 6: Add basic pagination to high-volume list pages

**Files:**
- Modify: `apps/admin/src/app/(dashboard)/leads/page.tsx`
- Modify: `apps/admin/src/app/(dashboard)/commissions/page.tsx`
- Modify: `apps/admin/src/app/(dashboard)/partners/page.tsx`

Without pagination, pages will load all rows and become slow. Add simple limit+offset URL-param pagination (50 per page).

- [ ] **Step 1: Add pagination to leads page**

In `apps/admin/src/app/(dashboard)/leads/page.tsx`:

Add `page` to searchParams:
```typescript
const { status, page } = await searchParams
const pageNum = Math.max(1, parseInt(page ?? "1", 10))
const limit = 50
const offset = (pageNum - 1) * limit
```

Add to the query:
```typescript
import { limit as drizzleLimit, offset as drizzleOffset } from "drizzle-orm"
```

Append to the query chain:
```typescript
.limit(limit)
.offset(offset)
```

Add a total count query:
```typescript
const [{ total }] = await db
  .select({ total: count() })
  .from(leads)
  .where(and(isNull(leads.deletedAt), status ? eq(leads.status, status) : undefined))
```

Add import: `import { count } from "drizzle-orm"`

Add pagination nav below the table:
```tsx
{total > limit && (
  <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800">
    <p className="text-zinc-500 text-sm">
      Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
    </p>
    <div className="flex gap-2">
      {pageNum > 1 && (
        <Link
          href={`/leads?${new URLSearchParams({ ...(status ? { status } : {}), page: String(pageNum - 1) })}`}
          className="px-3 py-1.5 rounded-md text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-colors"
        >
          Previous
        </Link>
      )}
      {offset + limit < total && (
        <Link
          href={`/leads?${new URLSearchParams({ ...(status ? { status } : {}), page: String(pageNum + 1) })}`}
          className="px-3 py-1.5 rounded-md text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-colors"
        >
          Next
        </Link>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 2: Apply same pattern to commissions page**

Same approach in `apps/admin/src/app/(dashboard)/commissions/page.tsx` — add `page` to searchParams, add `.limit(50).offset(offset)` to the query, add count query, add pagination nav.

- [ ] **Step 3: Apply same pattern to partners page**

Same approach in `apps/admin/src/app/(dashboard)/partners/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/app/(dashboard)/leads/page.tsx \
        apps/admin/src/app/(dashboard)/commissions/page.tsx \
        apps/admin/src/app/(dashboard)/partners/page.tsx
git commit -m "feat: add limit/offset pagination (50/page) to leads, commissions, partners list pages"
```

---

## Task 7: Partner email duplicate check on admin partner creation

**Files:**
- Modify: `apps/admin/src/app/api/admin/partners/route.ts` (or wherever admin creates partners)

When an admin creates a new partner, there should be a duplicate email check to prevent two partner records for the same email.

- [ ] **Step 1: Find the admin partner creation route**

Run:
```bash
find apps/admin/src/app/api -name "route.ts" | xargs grep -l "insert.*partners\|partners.*insert"
```

- [ ] **Step 2: Add duplicate email check**

In the POST handler, before the insert, add:

```typescript
const [existingPartner] = await db
  .select({ id: partners.id })
  .from(partners)
  .where(and(eq(partners.email, email), eq(partners.tenantId, tenantId), isNull(partners.deletedAt)))
  .limit(1)

if (existingPartner) {
  return NextResponse.json(
    { error: "A partner with this email already exists", duplicateId: existingPartner.id },
    { status: 409 }
  )
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "fix: prevent duplicate partner email on admin creation"
```

---

## Task 8: Partner onboarding field validation

**Files:**
- Modify: `apps/partner/src/app/onboarding/page.tsx`

Verify the onboarding form submits all required fields and validates them client-side before submission.

- [ ] **Step 1: Read the onboarding page**

Read `apps/partner/src/app/onboarding/page.tsx` in full.

- [ ] **Step 2: Verify required fields are validated**

Ensure the following are required and validated before form submit:
- `companyName` — non-empty string
- `contactName` — non-empty string
- `phone` — non-empty (UAE phone format preferred)
- `type` — one of: `referral`, `reseller`, `implementation`

If any required field has no client-side validation, add it:

```typescript
const errors: Record<string, string> = {}
if (!form.companyName.trim()) errors.companyName = "Company name is required"
if (!form.contactName.trim()) errors.contactName = "Contact name is required"
if (!form.type) errors.type = "Partner type is required"
if (Object.keys(errors).length > 0) {
  setErrors(errors)
  return
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/partner/src/app/onboarding/page.tsx
git commit -m "fix: ensure required fields are validated before onboarding form submission"
```

---

## Task 9: Verify email notifications are wired end-to-end

**Files:**
- Read: `packages/notifications/src/index.ts` (or wherever email templates live)

Email notifications are critical for partner activation and commission approval. Verify the key flows work.

- [ ] **Step 1: Enumerate notification trigger points**

Check these five triggers:
1. Partner submits lead → confirmation email to partner
2. Admin approves partner → welcome/approval email to partner
3. Commission approved → email to partner
4. Commission paid → email to partner
5. Service request created → notification to admin

Run:
```bash
grep -r "send.*Email\|sendEmail\|sendCommission\|sendPartner" apps/ packages/ --include="*.ts" -l
```

- [ ] **Step 2: Check that SENDGRID_API_KEY / email provider env var is set in .env**

If `SENDGRID_API_KEY` or `RESEND_API_KEY` is not in `.env.local`, emails silently fail. Add a startup warning if missing.

In `apps/partner/src/lib/env.ts` (or whichever env validation file), if the email key is optional but missing, log a startup warning:

```typescript
if (!process.env.SENDGRID_API_KEY && !process.env.RESEND_API_KEY) {
  console.warn("[notifications] No email provider API key set — emails will not be sent")
}
```

- [ ] **Step 3: Test lead submission email manually**

Submit a test lead from a partner account. Check server logs for email send result. Verify no silent errors.

- [ ] **Step 4: Commit any warning additions**

```bash
git commit -m "chore: add startup warning when email provider API key is missing"
```

---

## Task 10: Smoke test all workflows end-to-end

This task is manual verification — no code. Run through each persona's critical path.

- [ ] **Partner workflow**
  1. Register → complete onboarding → verify "Yet to Activate" shown
  2. Admin approves partner → verify status changes to "Active"
  3. Submit a lead → verify lead appears in both portals with "Not synced" or "In CRM"
  4. Submit a service request → verify it appears in admin service requests list
  5. View commissions page → verify it loads without error

- [ ] **Admin workflow**
  1. View all partners → verify pagination works at 50+
  2. Open partner detail → verify Edit button aligns correctly
  3. Approve a partner → verify status changes
  4. View lead detail → push to CRM if not synced → verify "In CRM" badge appears
  5. Update lead status to `qualified`, `proposal_sent`, `deal_won`

- [ ] **Finance workflow**
  1. Log in as finance-role user
  2. View commissions page — verify action buttons visible
  3. Log in as sdr-role user — verify action buttons hidden
  4. Approve a commission as finance → verify email sent to partner
  5. Mark as paid → verify status updates

- [ ] **Partnership manager workflow**
  1. Create a lead manually via `/leads/new`
  2. Assign it to a team member
  3. View analytics dashboard — verify data shows correctly

---

## Self-Review

**Spec coverage check:**
- Commission race condition → Task 1 ✓
- Analytics tenant isolation → Task 2 ✓
- Role-based commission UI → Task 3 ✓
- wonAt accuracy → Task 4 ✓
- Role-based lead/partner actions → Task 5 ✓
- Pagination → Task 6 ✓
- Partner email dedup → Task 7 ✓
- Onboarding validation → Task 8 ✓
- Email notifications → Task 9 ✓
- End-to-end smoke test → Task 10 ✓

**Explicitly out of scope (post-launch):**
- Stripe/payout automation (payout is currently manual "paid" button — acceptable for launch)
- SLA monitoring / auto-escalation
- Full-text search on list pages
- Commission breakdown format (cosmetic only)
