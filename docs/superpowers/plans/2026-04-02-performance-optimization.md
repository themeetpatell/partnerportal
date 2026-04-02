# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce admin/partner portal latency from 3-5s to <500ms by caching auth calls, switching to Supabase transaction pooler, increasing dev DB pool, adding Suspense boundaries, parallelizing DB queries, and adding loading states to action buttons.

**Architecture:** Fixes applied in order from highest-leverage/zero-risk to lower-leverage/higher-change-surface. Auth caching via React `cache()` eliminates 2-3 redundant Supabase round trips per request with zero call-site changes. Pooler URL eliminates cold-connection overhead on every Vercel serverless invocation. Suspense boundaries let the shell render before page data resolves. Query rewrites eliminate sequential DB round trips.

**Tech Stack:** Next.js 15.2 App Router, Drizzle ORM (postgres.js), Supabase Auth + Postgres, React `cache()` for per-request memoization, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-04-02-performance-optimization-design.md`

---

## File Map

**Modified:**
- `packages/auth/src/server.ts` — wrap `currentUser()` with React `cache()`
- `packages/db/src/client.ts` — increase dev pool max from 1 → 10
- `.env.example` — document pooler vs direct URL, add `DATABASE_URL_DIRECT`
- `apps/admin/src/app/(dashboard)/layout.tsx` — add Suspense around `{children}`
- `apps/partner/src/app/dashboard/layout.tsx` — add Suspense around `{children}`
- `apps/admin/src/app/(dashboard)/leads/[id]/page.tsx` — parallelize queries, JOIN partner
- `apps/partner/src/app/api/leads/route.ts` — add `Cache-Control` header to GET

**Created:**
- `apps/admin/src/components/page-skeleton.tsx` — skeleton fallback for admin Suspense
- `apps/partner/src/components/page-skeleton.tsx` — skeleton fallback for partner Suspense
- `apps/admin/src/components/partner-action-buttons.tsx` — client component with loading states for approve/reject

---

## Task 1: Wrap `currentUser()` with React `cache()`

**Files:**
- Modify: `packages/auth/src/server.ts`

This is the highest-leverage change in the entire plan. `currentUser()` currently creates a fresh Supabase client and fetches the user on every call. It is called by `auth()`, `getActiveTeamMember()`, `getActorName()`, and directly in layouts and pages — that is 3-5 Supabase network calls per page load. `cache()` memoizes the result for the duration of a single server request so all subsequent calls return the cached value instantly. No call sites need to change.

- [ ] **Step 1: Edit `packages/auth/src/server.ts`**

Replace the entire file with:

```typescript
import { cache } from "react"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getOptionalSupabaseAuthEnv, mapSupabaseUser } from "./shared"

export async function createAuthServerClient() {
  const cookieStore = await cookies()
  const env = getOptionalSupabaseAuthEnv()

  if (!env) {
    return null
  }

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {}
      },
    },
  })
}

export const currentUser = cache(async function currentUser() {
  const supabase = await createAuthServerClient()
  if (!supabase) {
    return null
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return mapSupabaseUser(user)
})

export async function auth() {
  const user = await currentUser()

  return {
    userId: user?.id ?? null,
  }
}
```

`auth()` calls `currentUser()` internally so it is automatically deduplicated at zero additional cost.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal" && npx tsc -p apps/admin/tsconfig.json --noEmit && npx tsc -p apps/partner/tsconfig.json --noEmit
```

Expected: No errors. If there are errors related to `cache` not being found, ensure `"react"` is in the package's dependencies.

- [ ] **Step 3: Smoke test**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal/apps/admin" && npm run dev
```

Open the admin dashboard at `http://localhost:3001`. Expected: Page loads, no auth errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal"
git add packages/auth/src/server.ts
git commit -m "perf: memoize currentUser() with React cache() to deduplicate Supabase auth calls per request"
```

---

## Task 2: Switch to Supabase transaction pooler URL

**Files:**
- Modify: `.env` (not committed — instructions only)
- Modify: `.env.example`

On Vercel serverless every function invocation opens a new Postgres connection. The transaction pooler at port 6543 maintains a persistent pool of connections server-side — your function connects to PgBouncer instead of Postgres directly, eliminating the cold-connection overhead (~300-500ms) on every invocation.

`drizzle.config.ts` already reads `DATABASE_URL_DIRECT` as the fallback for migrations. Use that env var name for the direct connection.

- [ ] **Step 1: Get your pooler URL from Supabase**

1. Open the Supabase dashboard → select your project
2. Go to **Settings → Database**
3. Scroll to **Connection string** → select **Transaction** mode
4. Copy the connection string. It looks like:
   `postgresql://postgres.xxxxxxxxxxxx:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres`
5. Also copy the **Direct** connection string (Session mode or the "Direct" tab):
   `postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxx.supabase.co:5432/postgres`

- [ ] **Step 2: Update your local `.env`**

In the `.env` at the repo root, update or add these two lines:

```
# Runtime connection — Supabase transaction pooler (Vercel serverless safe, port 6543)
DATABASE_URL=postgresql://postgres.YOURREF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true

# Migration connection — direct to Postgres (bypasses PgBouncer, port 5432)
DATABASE_URL_DIRECT=postgresql://postgres:PASSWORD@db.YOURREF.supabase.co:5432/postgres
```

The `?pgbouncer=true` flag tells the Postgres.js driver not to use prepared statements, which PgBouncer does not support.

- [ ] **Step 3: Update `.env.example`**

Open `.env.example` and replace the existing `DATABASE_URL` line with:

```
# Transaction pooler — used by the app at runtime (Vercel serverless safe, port 6543)
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection — used only by Drizzle migrations (bypasses PgBouncer, port 5432)
DATABASE_URL_DIRECT=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
```

- [ ] **Step 4: Verify migrations still work**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal/packages/db"
npx drizzle-kit generate
```

Expected: Drizzle reads `DATABASE_URL_DIRECT` (direct connection) and generates without error.

- [ ] **Step 5: Update Vercel environment variables**

In the Vercel dashboard — do this for **both** the admin project and the partner project:
1. **Settings → Environment Variables**
2. Update `DATABASE_URL` → set to the transaction pooler URL with `?pgbouncer=true`
3. Add `DATABASE_URL_DIRECT` → set to the direct connection URL

- [ ] **Step 6: Verify the app connects locally with pooler URL**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal/apps/admin" && npm run dev
```

Navigate to the admin dashboard. Expected: Loads normally with no `ECONNREFUSED` or Postgres errors.

- [ ] **Step 7: Commit `.env.example` only**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal"
git add .env.example
git commit -m "perf: document Supabase transaction pooler pattern in .env.example"
```

Do NOT commit `.env` — it contains secrets.

---

## Task 3: Increase dev DB connection pool from 1 to 10

**Files:**
- Modify: `packages/db/src/client.ts` line 20

The current default of `1` connection in development means every DB query must wait for the previous one to finish. Increasing to 10 allows concurrent queries.

- [ ] **Step 1: Edit `packages/db/src/client.ts` line 20**

```typescript
// Before
return process.env.NODE_ENV === "production" ? 5 : 1

// After
return process.env.NODE_ENV === "production" ? 5 : 10
```

- [ ] **Step 2: Verify the app still starts**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal/apps/admin" && npm run dev
```

Expected: Starts cleanly, no pool-related errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal"
git add packages/db/src/client.ts
git commit -m "perf: increase dev DB connection pool from 1 to 10 to allow concurrent queries"
```

---

## Task 4: Create page skeleton components

**Files:**
- Create: `apps/admin/src/components/page-skeleton.tsx`
- Create: `apps/partner/src/components/page-skeleton.tsx`

These are used as Suspense fallbacks in the next two tasks.

- [ ] **Step 1: Create the admin skeleton**

Create `apps/admin/src/components/page-skeleton.tsx`:

```tsx
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-white/8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-white/8" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 rounded-2xl bg-white/8" />
        <div className="h-64 rounded-2xl bg-white/8" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the partner skeleton**

Create `apps/partner/src/components/page-skeleton.tsx`:

```tsx
export function PageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-lg bg-white/8" />
          <div className="h-4 w-80 rounded bg-white/6" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-28 rounded-lg bg-white/8" />
          <div className="h-9 w-32 rounded-lg bg-white/8" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-white/8" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 rounded-2xl bg-white/8" />
        <div className="h-80 rounded-2xl bg-white/8" />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal"
git add apps/admin/src/components/page-skeleton.tsx apps/partner/src/components/page-skeleton.tsx
git commit -m "feat: add PageSkeleton components as Suspense fallbacks for dashboard layouts"
```

---

## Task 5: Add Suspense boundary to admin layout

**Files:**
- Modify: `apps/admin/src/app/(dashboard)/layout.tsx`

Currently the entire layout (sidebar + page content) blocks until auth + DB queries resolve. Wrapping `{children}` in `<Suspense>` lets the sidebar shell render immediately while page content streams in. With Task 1 done, the auth check for the sidebar now takes only 1 Supabase call instead of 3.

- [ ] **Step 1: Edit `apps/admin/src/app/(dashboard)/layout.tsx`**

Replace the entire file with:

```tsx
import { Suspense } from "react"
import { auth, currentUser } from "@repo/auth/server"
import { redirect } from "next/navigation"
import { AdminSidebarNav } from "@/components/admin-sidebar-nav"
import { PageSkeleton } from "@/components/page-skeleton"
import { getActiveTeamMember } from "@/lib/admin-auth"

function formatRoleLabel(role: string | null | undefined) {
  if (!role) {
    return "Admin"
  }

  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [{ userId }, user] = await Promise.all([auth(), currentUser()])

  if (!userId || !user) {
    redirect("/sign-in")
  }

  const teamMember = await getActiveTeamMember(userId)

  if (!teamMember) {
    redirect("/sign-in")
  }

  const userName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Admin"

  const userEmail = user.email || ""

  const userInitials =
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    userEmail.slice(0, 2).toUpperCase() ||
    "A"

  const userRole = formatRoleLabel(teamMember.role)

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row">
      <AdminSidebarNav
        userName={userName}
        userEmail={userEmail}
        userInitials={userInitials}
        userRole={userRole}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Suspense fallback={<PageSkeleton />}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Test in browser**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal/apps/admin" && npm run dev
```

Navigate to `http://localhost:3001/`. Expected: The sidebar renders immediately, then the page content appears (skeleton may flash briefly).

- [ ] **Step 3: Commit**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal"
git add "apps/admin/src/app/(dashboard)/layout.tsx"
git commit -m "perf: add Suspense boundary to admin layout so sidebar renders before page data resolves"
```

---

## Task 6: Add Suspense boundary to partner layout

**Files:**
- Modify: `apps/partner/src/app/dashboard/layout.tsx`

- [ ] **Step 1: Edit `apps/partner/src/app/dashboard/layout.tsx`**

Replace the entire file with:

```tsx
import { Suspense } from "react"
import { currentUser } from "@repo/auth/server"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/sidebar-nav"
import { PageSkeleton } from "@/components/page-skeleton"
import {
  getPartnerRecordByAuthUserId,
  hasApprovedWorkspaceAccess,
} from "@/lib/partner-record"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in")
  }

  const partnerRecord = await getPartnerRecordByAuthUserId(user.id)

  if (!partnerRecord) {
    redirect("/onboarding")
  }

  const userName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Partner"

  const userEmail = user.email || ""

  const userInitials =
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    userEmail.slice(0, 2).toUpperCase() ||
    "P"

  return (
    <div className="page-wrap min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 lg:gap-5">
        <SidebarNav
          userName={userName}
          userEmail={userEmail}
          userInitials={userInitials}
          hasWorkspaceAccess={hasApprovedWorkspaceAccess(partnerRecord)}
          partnerStatus={partnerRecord.status}
          contractStatus={partnerRecord.contractStatus}
          isOnboarded={Boolean(partnerRecord.onboardedAt)}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="surface-card-strong flex-1 rounded-[2rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <Suspense fallback={<PageSkeleton />}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test in browser**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal/apps/partner" && npm run dev
```

Navigate to `http://localhost:3000/dashboard`. Expected: Sidebar renders immediately, page content streams in with skeleton fallback.

- [ ] **Step 3: Commit**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal"
git add apps/partner/src/app/dashboard/layout.tsx
git commit -m "perf: add Suspense boundary to partner layout so sidebar renders before page data resolves"
```

---

## Task 7: Parallelize lead detail queries and JOIN partner

**Files:**
- Modify: `apps/admin/src/app/(dashboard)/leads/[id]/page.tsx` lines 66–83

Currently: lead → partner → documents = 3 sequential DB round trips.
After: `[lead+partner via JOIN, documents]` in `Promise.all` = 1 round trip.

- [ ] **Step 1: Replace lines 66–83 in `apps/admin/src/app/(dashboard)/leads/[id]/page.tsx`**

The current code at lines 66–83 is:
```typescript
const [lead] = await db
  .select()
  .from(leads)
  .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
  .limit(1)

if (!lead) notFound()

const [partner] = await db
  .select()
  .from(partners)
  .where(eq(partners.id, lead.partnerId))
  .limit(1)

const leadDocs = await db
  .select()
  .from(documents)
  .where(and(eq(documents.ownerType, "lead"), eq(documents.ownerId, id)))
```

Replace it with:
```typescript
const [[leadRow], leadDocs] = await Promise.all([
  db
    .select({ lead: leads, partner: partners })
    .from(leads)
    .leftJoin(partners, eq(partners.id, leads.partnerId))
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
    .limit(1),
  db
    .select()
    .from(documents)
    .where(and(eq(documents.ownerType, "lead"), eq(documents.ownerId, id))),
])

if (!leadRow) notFound()

const lead = leadRow.lead
const partner = leadRow.partner
```

- [ ] **Step 2: Verify the import for `leftJoin` is not needed**

`.leftJoin()` is a method on the Drizzle query builder — it does not need a separate import. The existing imports `eq`, `and`, `isNull` are sufficient.

- [ ] **Step 3: Build check**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal" && npx tsc -p apps/admin/tsconfig.json --noEmit
```

Expected: No type errors. If Drizzle infers the joined type incorrectly, adjust to:
```typescript
const lead = leadRow.lead
const partner = leadRow.partner ?? null
```

- [ ] **Step 4: Test lead detail page in browser**

Navigate to `http://localhost:3001/leads/[any-lead-id]`. Expected: All sections render — customer info, documents, partner info in the right column.

- [ ] **Step 5: Commit**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal"
git add "apps/admin/src/app/(dashboard)/leads/[id]/page.tsx"
git commit -m "perf: parallelize lead detail queries and use LEFT JOIN for partner lookup (3 round trips → 1)"
```

---

## Task 8: Add loading states to admin partner action buttons

**Files:**
- Create: `apps/admin/src/components/partner-action-buttons.tsx`
- Modify: `apps/admin/src/app/(dashboard)/partners/[id]/page.tsx`

The approve/reject/lifecycle buttons are currently native `<form method="POST">` elements. When clicked they trigger a full page reload with no feedback — the browser appears frozen for 2-4 seconds while the server processes the action and redirects. Converting them to a client component with `fetch()` + loading state makes the UI respond within 100ms.

- [ ] **Step 1: Identify the approve/reject/lifecycle button area**

Open `apps/admin/src/app/(dashboard)/partners/[id]/page.tsx` and locate the section where approve/reject forms exist (around lines 338–500). Note the API endpoints used: `/api/partners/[id]/approve`, `/api/partners/[id]/reject`, `/api/partners/[id]/lifecycle`.

- [ ] **Step 2: Create `apps/admin/src/components/partner-action-buttons.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, PauseCircle, RotateCcw } from "lucide-react"

type ActionButtonProps = {
  partnerId: string
  action: string
  endpoint: string
  label: string
  confirmLabel?: string
  variant: "green" | "red" | "yellow" | "slate"
  icon: "approve" | "reject" | "suspend" | "reactivate"
  extraBody?: Record<string, string>
}

const variantClasses: Record<ActionButtonProps["variant"], string> = {
  green: "bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700",
  red: "bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:text-red-700",
  yellow: "bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-900 disabled:text-yellow-700",
  slate: "bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-slate-600",
}

const icons = {
  approve: CheckCircle,
  reject: XCircle,
  suspend: PauseCircle,
  reactivate: RotateCcw,
}

export function PartnerActionButton({
  partnerId,
  action,
  endpoint,
  label,
  confirmLabel,
  variant,
  icon,
  extraBody = {},
}: ActionButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const Icon = icons[icon]

  async function handleClick() {
    if (confirmLabel && !window.confirm(confirmLabel)) return
    setLoading(true)
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraBody }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed ${variantClasses[variant]}`}
    >
      <Icon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Processing…" : label}
    </button>
  )
}

type RejectFormProps = {
  partnerId: string
}

export function PartnerRejectForm({ partnerId }: RejectFormProps) {
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState("")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`/api/partners/${partnerId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="mt-4 block">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Optional rejection reason
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Explain why the application cannot be approved right now."
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-900 disabled:text-red-700"
      >
        <XCircle className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Processing…" : "Reject application"}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Replace the native `<form>` approve button in the partner detail page**

In `apps/admin/src/app/(dashboard)/partners/[id]/page.tsx`:

1. Add the import at the top:
```tsx
import { PartnerActionButton, PartnerRejectForm } from "@/components/partner-action-buttons"
```

2. Find the approve `<form>` block (the one with `action={/api/partners/${partner.id}/lifecycle}` and `value="approve"`). Replace the entire `<form>...</form>` block with:
```tsx
<div className="surface-card rounded-2xl p-5">
  <div className="flex items-start justify-between gap-4">
    <div>
      <h2 className="text-white font-semibold">Approve application</h2>
      <p className="mt-1 text-sm text-slate-400">
        Confirms the partner passed review. Workspace access stays locked until the
        contract is signed and the signed agreement is accepted.
      </p>
    </div>
    <CheckCircle className="mt-0.5 h-5 w-5 text-green-400" />
  </div>
  <PartnerActionButton
    partnerId={partner.id}
    action="approve"
    endpoint={`/api/partners/${partner.id}/lifecycle`}
    label="Approve application"
    variant="green"
    icon="approve"
    extraBody={{ action: "approve" }}
  />
</div>
```

3. Find the reject `<form>` block. Replace it with:
```tsx
<div className="surface-card rounded-2xl p-5">
  <div className="flex items-start justify-between gap-4">
    <div>
      <h2 className="text-white font-semibold">Reject application</h2>
      <p className="mt-1 text-sm text-slate-400">
        Keeps the workspace locked and emails the applicant with the review outcome.
      </p>
    </div>
    <XCircle className="mt-0.5 h-5 w-5 text-red-400" />
  </div>
  <PartnerRejectForm partnerId={partner.id} />
</div>
```

4. For any other lifecycle action `<form>` elements (suspend, send_contract, reactivate, etc.), replace each `<button type="submit">` with `<PartnerActionButton>` using the appropriate `action`, `endpoint`, `variant`, and `icon` props.

- [ ] **Step 4: Test the buttons in browser**

Navigate to `http://localhost:3001/partners/[any-pending-partner-id]`. Click "Approve application". Expected: Button immediately shows "Processing…" with spinning icon, then page refreshes with updated status. No 2-4 second frozen UI.

- [ ] **Step 5: Commit**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal"
git add apps/admin/src/components/partner-action-buttons.tsx "apps/admin/src/app/(dashboard)/partners/[id]/page.tsx"
git commit -m "perf: convert partner action buttons to client component with immediate loading states"
```

---

## Task 9: Add `Cache-Control` headers to partner leads GET route

**Files:**
- Modify: `apps/partner/src/app/api/leads/route.ts`

The GET handler at line 239 fetches all leads for the authenticated partner. This is called from the new lead form to show recent submissions. Adding `private, stale-while-revalidate` headers lets the browser cache the response — repeat navigations to the new lead form are instant.

- [ ] **Step 1: Edit `apps/partner/src/app/api/leads/route.ts`**

Find the `return NextResponse.json(...)` at the end of the `GET` handler (around line 265) and add headers:

```typescript
// Before
return NextResponse.json({
  leads: partnerLeads.map((lead) => ({
    ...lead,
    serviceInterest: (() => {
      try {
        return JSON.parse(lead.serviceInterest)
      } catch {
        return []
      }
    })(),
  })),
})

// After
return NextResponse.json(
  {
    leads: partnerLeads.map((lead) => ({
      ...lead,
      serviceInterest: (() => {
        try {
          return JSON.parse(lead.serviceInterest)
        } catch {
          return []
        }
      })(),
    })),
  },
  {
    headers: {
      "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60",
    },
  }
)
```

`private` ensures user-specific lead data is never served to a different user from a shared CDN cache.

- [ ] **Step 2: Check for other GET routes that serve list data**

```bash
grep -r "export async function GET" "/Users/themeetpatel/Startups/Partner Portal/apps/partner/src/app/api/" "/Users/themeetpatel/Startups/Partner Portal/apps/admin/src/app/api/" 2>/dev/null
```

For any GET route that returns list data (not auth-gated per-user data), add the same `Cache-Control` header pattern. For admin routes serving aggregated/shared data, use `s-maxage=30, stale-while-revalidate=60` (without `private`).

- [ ] **Step 3: Commit**

```bash
cd "/Users/themeetpatel/Startups/Partner Portal"
git add apps/partner/src/app/api/leads/route.ts
git commit -m "perf: add stale-while-revalidate cache headers to partner leads GET route"
```

---

## Spec Coverage Self-Review

| Spec Requirement | Task | Status |
|---|---|---|
| 1.1 Auth request-level caching | Task 1 | ✅ |
| 1.2 Supabase transaction pooler | Task 2 | ✅ |
| 1.3 Dev DB pool size 1→10 | Task 3 | ✅ |
| 2.1 Parallelize sequential queries | Task 7 | ✅ |
| 2.2 Replace N+1 with JOINs | Task 7 | ✅ (lead+partner JOIN) |
| 2.3 Dashboard aggregations | — | ℹ️ Admin dashboard already uses `Promise.all` for all 7 queries — already optimized, no task needed |
| 2.4 Select field pruning | — | ℹ️ Low-leverage; pages already use explicit field lists in most queries. Deferred. |
| 3.1 Loading states on action buttons | Task 8 | ✅ |
| 3.2 Suspense boundaries in layouts | Tasks 5 + 6 | ✅ |
| 3.3 Convert client pages to Server Components | — | ℹ️ Partner dashboard overview page is already a Server Component. Commissions/clients pages should be verified by reading their source — if they use `useEffect` for data fetching, apply the same pattern as Task 8 (extract `useEffect` → server fetch, split interactive parts into `"use client"` sub-components). |
| 3.4 Cache headers on API routes | Task 9 | ✅ |

---

## Verification Checklist

After all tasks are complete:

- [ ] Open admin dashboard — sidebar appears in <200ms, page content streams in
- [ ] Open partner dashboard — sidebar appears in <200ms, page content streams in
- [ ] Click "Approve application" on any pending partner — button shows "Processing…" immediately
- [ ] Open admin lead detail — page loads with all three sections (customer, documents, partner)
- [ ] Check Vercel deployment logs — no cold-connection errors, function duration <500ms for list pages
- [ ] Check browser Network tab — `GET /api/leads` response includes `Cache-Control: private, s-maxage=30`
