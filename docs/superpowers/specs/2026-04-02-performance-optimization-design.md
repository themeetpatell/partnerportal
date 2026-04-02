# Performance Optimization Design
**Date:** 2026-04-02  
**Scope:** Admin portal + Partner portal (both apps)  
**Goal:** Reduce button/page action latency from 3-5s to <500ms  
**Approach:** Option B — Comprehensive Optimization

---

## Problem Summary

Both portals (admin at port 3001, partner at port 3000) deployed on Vercel serverless experience 3-5 second delays on every button click and page action. Root cause analysis identified 7 bottlenecks:

| # | Bottleneck | Location | Severity |
|---|-----------|----------|----------|
| 1 | `currentUser()` creates a fresh Supabase client on every call, no caching | `packages/auth/src/server.ts` | Critical |
| 2 | Direct DB connection URL used on Vercel serverless (no pooler) | `.env` / Vercel env vars | Critical |
| 3 | Dev DB pool `max: 1` — serializes all queries in development | `packages/db/src/client.ts` | Critical (dev) |
| 4 | Sequential DB queries instead of parallel / JOINs | Multiple pages and API routes | High |
| 5 | Buttons have no loading state — UI freezes with no feedback | All action handlers | High |
| 6 | Dashboard layouts block rendering until all data loads (no Suspense) | Both layout.tsx files | High |
| 7 | Heavy pages fetch data in `useEffect` inside client components | Partner commissions, clients, overview | Medium |

---

## Section 1: Auth & Database Layer

### 1.1 Auth Request-Level Caching

**File:** `packages/auth/src/server.ts`

Wrap `currentUser()` and `auth()` with Next.js `cache()`. This memoizes the result per-request — the first call hits Supabase, every subsequent call within the same request returns the cached result at zero cost.

```typescript
import { cache } from 'react'

export const currentUser = cache(async () => {
  const supabase = await createAuthServerClient()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return mapSupabaseUser(user)
})

export const auth = cache(async () => {
  const supabase = await createAuthServerClient()
  if (!supabase) return { userId: null }
  const { data: { user } } = await supabase.auth.getUser()
  return { userId: user?.id ?? null }
})
```

No changes required at call sites. The middleware `updateSession()` continues as-is but subsequent calls within the same request are free.

**Expected gain:** Eliminates 2-3 redundant Supabase round trips per page load (~600-1500ms saved).

### 1.2 Supabase Transaction Pooler

**Files:** `.env`, `.env.example`, Vercel environment variables (admin + partner projects)

Change `DATABASE_URL` from the direct connection to the transaction pooler:

- Direct (current): `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`
- Pooler (target): `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

The transaction pooler URL is available in Supabase dashboard → Settings → Database → Connection string → Transaction mode.

Add a separate `DIRECT_URL` env var with the direct connection (port 5432) for Drizzle migrations — migrations must bypass PgBouncer. The runtime `DATABASE_URL` uses the pooler URL with `?pgbouncer=true` appended.

**Expected gain:** Eliminates cold-connection overhead on every Vercel serverless invocation (~300-500ms saved per request in production).

### 1.3 Dev DB Pool Size

**File:** `packages/db/src/client.ts`

```typescript
function getPoolMax() {
  return process.env.NODE_ENV === 'production' ? 5 : 10  // was 1 in dev
}
```

**Expected gain:** Unserializes all dev queries immediately. Queries that previously waited for a single connection now run concurrently.

---

## Section 2: Database Query Optimization

### 2.1 Parallelize Sequential Queries

Replace sequential `await` chains with `Promise.all()` where queries are independent.

**Lead detail page** (`apps/admin/src/app/(dashboard)/leads/[id]/page.tsx`):
```typescript
// Before (3 sequential round trips)
const [lead] = await db.select()...
const [partner] = await db.select()... // waits for lead
const leadDocs = await db.select()...  // waits for partner

// After (2 round trips instead of 3 — docs no longer wait for partner)
const [[lead], leadDocs] = await Promise.all([
  db.select().from(leads).where(...),
  db.select().from(documents).where(...),
])
// Partner still needs lead.partnerId — use JOIN (see 2.2) to eliminate this entirely
```

**Admin layouts** — parallelize `auth()` + `getActiveTeamMember()` by fetching user ID first, then running DB lookup concurrently with any other layout data fetch.

### 2.2 Replace N+1 with JOINs

Where a second query fetches a record by ID returned from the first query, replace with a single Drizzle `.leftJoin()`:

**Lead detail (partner lookup):**
```typescript
const [result] = await db
  .select({ lead: leads, partner: partners })
  .from(leads)
  .leftJoin(partners, eq(leads.partnerId, partners.id))
  .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
  .limit(1)
```

Apply same pattern to any page fetching a related entity in a follow-up query.

### 2.3 Dashboard Aggregations

**File:** `apps/admin/src/app/(dashboard)/page.tsx`

Consolidate 7 separate queries into 3:
1. One query for all partner counts (total, pending, approved) using conditional aggregation
2. One query for all lead counts (total, pending)
3. One query for commission totals

### 2.4 Select Field Pruning

Replace bare `db.select()` (all columns) with explicit field lists on list pages that render 20-50 rows. Reduces payload size and DB transfer time.

Target pages: admin leads list, admin partners list, partner commissions list.

---

## Section 3: UI Responsiveness & Streaming

### 3.1 Loading States on All Action Buttons

Every button triggering an API call gets an immediate loading state on click — before the fetch resolves.

For **regular fetch() calls** (most action buttons):
```typescript
const [loading, setLoading] = useState(false)

async function handleAction() {
  setLoading(true)
  try {
    await fetch('/api/...')
    // update state
  } finally {
    setLoading(false)
  }
}

<Button disabled={loading} onClick={handleAction}>
  {loading ? <Spinner /> : 'Approve'}
</Button>
```

For **Server Actions** (if migrated in future), prefer `useTransition` — it integrates with React's concurrent model and avoids blocking the input thread:
```typescript
const [isPending, startTransition] = useTransition()
const handleAction = () => startTransition(async () => { await myServerAction() })
```

Apply to: approve/reject partner buttons, lead status updates, commission approval, form submissions (new lead, register, profile save).

### 3.2 Suspense Boundaries in Layouts

**Files:** `apps/admin/src/app/(dashboard)/layout.tsx`, `apps/partner/src/app/dashboard/layout.tsx`

Wrap the async page slot in `<Suspense>` so the shell (nav, sidebar) renders immediately while page content streams in:

```tsx
// layout.tsx
export default async function DashboardLayout({ children }) {
  // Only fetch what the layout itself needs (auth check)
  const user = await currentUser()
  
  return (
    <Shell user={user}>
      <Suspense fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </Shell>
  )
}
```

Move per-page data fetching into the page components themselves (not the layout). Create a shared `<PageSkeleton />` component as the fallback.

### 3.3 Convert Heavy Client Pages to Server Components

These pages have no interactivity that requires `'use client'` but fetch data in `useEffect`:

| Page | File | Action |
|------|------|--------|
| Partner commissions | `apps/partner/src/app/dashboard/(workspace)/commissions/page.tsx` | Remove `'use client'`, fetch server-side |
| Partner clients | `apps/partner/src/app/dashboard/(workspace)/clients/page.tsx` | Remove `'use client'`, fetch server-side |
| Partner dashboard overview | `apps/partner/src/app/dashboard/(workspace)/page.tsx` | Remove `'use client'`, fetch server-side |

Split interactive parts (filters, modals) into small `'use client'` sub-components. Keep data fetching in the Server Component parent.

### 3.4 Cache Headers on Read-Heavy API Routes

Add `Cache-Control` headers to API routes that serve list/aggregate data:

```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 's-maxage=30, stale-while-revalidate=60'
  }
})
```

Target routes:
- `GET /api/admin/partners`
- `GET /api/admin/leads`
- `GET /api/admin/analytics`
- `GET /api/commissions`
- `GET /api/leads` (partner-side)

Do NOT add to mutation routes (POST, PATCH, DELETE).

---

## Out of Scope

The following were identified but excluded from this optimization pass (Option C territory):

- Redis cross-request caching
- React Query / optimistic updates
- Full database index audit
- Bundle splitting / lazy loading
- Rate limiter migration to Redis

---

## Success Criteria

- Button clicks show loading feedback within 100ms (immediate)
- API routes respond in <500ms for list endpoints, <800ms for detail pages
- Dashboard shell renders within 200ms (Suspense boundary)
- No regression in existing functionality

---

## Implementation Order

1. Auth caching (`cache()` wrapper) — highest leverage, zero risk
2. Supabase pooler URL — config change, production impact
3. Dev pool size — one-line fix
4. Loading states on buttons — UI polish, independent
5. Suspense boundaries — layout restructure
6. DB query parallelization + JOINs — query rewrites
7. Server Component conversions — component refactors
8. Cache headers — final polish
