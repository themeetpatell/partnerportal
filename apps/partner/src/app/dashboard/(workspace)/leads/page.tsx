import { db, leads, serviceRequests, services } from "@repo/db"
import { and, desc, eq, isNull } from "drizzle-orm"
import Link from "next/link"
import { LayoutGrid, List, Plus, Users } from "lucide-react"
import { DatabaseFallbackCard } from "@/components/database-fallback-card"
import { getDatabaseErrorHost, isDatabaseConnectivityError } from "@/lib/database-error"
import { getCurrentPartnerRecord } from "@/lib/partner-record"

type InboxKind = "all" | "net_new" | "cross_sell"

/** Cap list fetch to keep navigation responsive (aligned with admin leads list). */
const PARTNER_PIPELINE_LIST_LIMIT = 500

function parseKind(value: string | undefined): InboxKind {
  if (value === "net_new" || value === "cross_sell") return value
  return "all"
}

const pipelineTabs = [
  { label: "All stages", value: undefined },
  { label: "Submitted", value: "submitted" },
  { label: "Lead Approved", value: "lead_approved" },
  { label: "Lead Follow-up", value: "lead_follow_up" },
  { label: "Lead Qualified", value: "lead_qualified" },
  { label: "Proposal Sent", value: "proposal_sent" },
  { label: "Deal Won", value: "deal_won" },
  { label: "Deal Lost", value: "deal_lost" },
] as const

const requestTabs = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
] as const

const statusStyles: Record<string, string> = {
  submitted: "border border-border bg-secondary text-foreground/90",
  lead_approved: "border border-sky-400/20 bg-sky-500/10 text-sky-100",
  lead_follow_up: "border border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  lead_qualified: "border border-indigo-400/20 bg-indigo-500/10 text-indigo-100",
  proposal_sent: "border border-primary/20 bg-primary/10 text-primary",
  deal_won: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  deal_lost: "border border-border bg-secondary/60 text-muted-foreground",
}

const requestStatusStyles: Record<string, string> = {
  pending: "border border-border bg-secondary text-foreground/90",
  in_progress: "border border-border bg-secondary text-foreground/90",
  completed: "border border-border bg-secondary text-foreground",
  cancelled: "border border-border bg-secondary/60 text-muted-foreground",
}

function formatDate(date: Date | null) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ")
}

function parseServices(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatRequestServices(rawList: string | null, serviceName: string | null) {
  if (rawList) {
    try {
      const parsed = JSON.parse(rawList)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    } catch {
      // fall through
    }
  }
  return serviceName ? [serviceName] : []
}

function qs(p: Record<string, string | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== "") sp.set(k, v)
  }
  return sp.toString()
}

function TypeBadge({ crossSell }: { crossSell: boolean }) {
  if (crossSell) {
    return (
      <span className="status-pill border border-violet-400/25 bg-violet-500/10 text-violet-100">
        Cross-sell
      </span>
    )
  }
  return (
    <span className="status-pill border border-border bg-secondary/70 text-[var(--portal-text-soft)]">
      New lead
    </span>
  )
}

type LeadRow = typeof leads.$inferSelect
type RequestRow = {
  id: string
  customerCompany: string
  customerContact: string
  customerEmail: string
  status: string
  createdAt: Date
  servicesList: string | null
  serviceName: string | null
}

type UnifiedRow =
  | {
      record: "lead"
      id: string
      title: string
      sub: string
      createdAt: Date
      status: string
      services: string[]
      href: string
      actionLabel: string
    }
  | {
      record: "cross_sell"
      id: string
      title: string
      sub: string
      createdAt: Date
      status: string
      services: string[]
      href: string
      actionLabel: string
    }

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; kind?: string; status?: string }>
}) {
  const { view, kind: kindParam, status } = await searchParams
  const kind = parseKind(kindParam)
  const viewMode = view === "kanban" ? "kanban" : "table"

  const partner = await getCurrentPartnerRecord()

  let leadRows: LeadRow[] = []
  let requestRows: RequestRow[] = []

  try {
    if (partner) {
      const leadStatusFilter =
        kind !== "cross_sell" && status ? eq(leads.status, status) : undefined
      const requestStatusFilter =
        kind === "cross_sell" && status ? eq(serviceRequests.status, status) : undefined

      const [lr, rr] = await Promise.all([
        kind === "cross_sell"
          ? Promise.resolve([] as LeadRow[])
          : db
              .select()
              .from(leads)
              .where(and(eq(leads.partnerId, partner.id), isNull(leads.deletedAt), leadStatusFilter))
              .orderBy(desc(leads.createdAt))
              .limit(PARTNER_PIPELINE_LIST_LIMIT),
        kind === "net_new"
          ? Promise.resolve([] as RequestRow[])
          : db
              .select({
                id: serviceRequests.id,
                customerCompany: serviceRequests.customerCompany,
                customerContact: serviceRequests.customerContact,
                customerEmail: serviceRequests.customerEmail,
                status: serviceRequests.status,
                createdAt: serviceRequests.createdAt,
                servicesList: serviceRequests.servicesList,
                serviceName: services.name,
              })
              .from(serviceRequests)
              .leftJoin(services, eq(serviceRequests.serviceId, services.id))
              .where(
                and(
                  eq(serviceRequests.partnerId, partner.id),
                  isNull(serviceRequests.deletedAt),
                  requestStatusFilter,
                ),
              )
              .orderBy(desc(serviceRequests.createdAt))
              .limit(PARTNER_PIPELINE_LIST_LIMIT),
      ])
      leadRows = lr
      requestRows = rr
    }
  } catch (error) {
    if (isDatabaseConnectivityError(error)) {
      console.error("Leads page database query failed", error)
      return (
        <DatabaseFallbackCard
          title="Leads list is unavailable"
          message="The page loaded, but the leads query timed out or could not reach Postgres."
          host={getDatabaseErrorHost(error)}
        />
      )
    }
    throw error
  }

  const unified: UnifiedRow[] = []
  for (const lead of leadRows) {
    unified.push({
      record: "lead",
      id: lead.id,
      title: lead.customerName,
      sub: [lead.customerCompany, lead.customerEmail].filter(Boolean).join(" · ") || lead.customerEmail,
      createdAt: lead.createdAt,
      status: lead.status,
      services: parseServices(lead.serviceInterest),
      href: `/dashboard/leads/${lead.id}`,
      actionLabel: "Open lead",
    })
  }
  for (const row of requestRows) {
    unified.push({
      record: "cross_sell",
      id: row.id,
      title: row.customerCompany,
      sub: `${row.customerContact} · ${row.customerEmail}`,
      createdAt: row.createdAt,
      status: row.status,
      services: formatRequestServices(row.servicesList, row.serviceName),
      href: `/dashboard/service-requests/${row.id}`,
      actionLabel: "Open request",
    })
  }

  unified.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const openCount = leadRows.filter((r) => !["deal_won", "deal_lost"].includes(r.status)).length
  const wonCount = leadRows.filter((r) => r.status === "deal_won").length
  const crossSellOpen = requestRows.filter((r) => !["completed", "cancelled"].includes(r.status)).length

  const kanbanStatuses = pipelineTabs.flatMap((tab) =>
    tab.value ? [{ key: tab.value, label: tab.label }] : [],
  )

  const kanbanBuckets = new Map<string, LeadRow[]>(kanbanStatuses.map((statusItem) => [statusItem.key, []]))
  const unknownStatusRows: LeadRow[] = []
  for (const lead of leadRows) {
    const bucket = kanbanBuckets.get(lead.status)
    if (bucket) {
      bucket.push(lead)
    } else {
      unknownStatusRows.push(lead)
    }
  }

  const requestKanbanKeys = [
    { key: "pending", label: "Pending" },
    { key: "in_progress", label: "In progress" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ] as const
  const requestBuckets = new Map<string, RequestRow[]>(requestKanbanKeys.map((k) => [k.key, []]))
  const unknownRequestRows: RequestRow[] = []
  for (const r of requestRows) {
    const b = requestBuckets.get(r.status)
    if (b) b.push(r)
    else unknownRequestRows.push(r)
  }

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-[2rem] px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">Leads to Finanshels</div>
            <h1 className="page-title mt-5">Leads</h1>
            <p className="page-subtitle mt-3 max-w-2xl">
              One inbox for new introductions and cross-sell requests tied to clients you already closed.
              Filter by type and stage like a CRM.
            </p>
          </div>
          <Link href="/dashboard/leads/new" className="primary-button w-full justify-center sm:w-auto">
            <Plus className="h-4 w-4" />
            Submit lead or cross-sell
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="inline-flex flex-wrap rounded-xl border border-border bg-secondary/50 p-1">
            <Link
              href={`/dashboard/leads?${qs({ view: viewMode })}`}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                kind === "all" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All activity
            </Link>
            <Link
              href={`/dashboard/leads?${qs({ kind: "net_new", view: viewMode })}`}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                kind === "net_new" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              New leads
            </Link>
            <Link
              href={`/dashboard/leads?${qs({ kind: "cross_sell", view: viewMode })}`}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                kind === "cross_sell" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cross-sell
            </Link>
          </div>

          <div className="inline-flex rounded-xl border border-border bg-secondary/50 p-1">
            <Link
              href={`/dashboard/leads?${qs({
                ...(kind !== "all" ? { kind } : {}),
                view: "table",
              })}`}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === "table" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </Link>
            <Link
              href={`/dashboard/leads?${qs({
                ...(kind !== "all" ? { kind } : {}),
                view: "kanban",
              })}`}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === "kanban" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </Link>
          </div>
        </div>

        {kind === "cross_sell" ? (
          <div className="mt-4 inline-flex flex-wrap rounded-xl border border-border bg-secondary/50 p-1">
            {requestTabs.map((tab) => {
              const active = status === tab.value || (!tab.value && !status)
              return (
                <Link
                  key={tab.label}
                  href={`/dashboard/leads?${qs({
                    kind: "cross_sell",
                    ...(tab.value ? { status: tab.value } : {}),
                    view: viewMode,
                  })}`}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="mt-4 inline-flex flex-wrap rounded-xl border border-border bg-secondary/50 p-1">
            {pipelineTabs.map((tab) => {
              const active = status === tab.value || (!tab.value && !status)
              return (
                <Link
                  key={tab.label}
                  href={`/dashboard/leads?${qs({
                    ...(kind === "net_new" ? { kind: "net_new" } : {}),
                    ...(tab.value ? { status: tab.value } : {}),
                    view: viewMode,
                  })}`}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        )}

        {kind === "all" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Pipeline filters narrow <span className="font-medium text-foreground">new leads</span> only; cross-sell
            referrals stay visible in this combined list.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="metric-card">
            <p className="metric-value">{unified.length}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Inbox items</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New leads plus cross-sell rows in your current filters.
            </p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{openCount}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Pipeline (new leads)</p>
            <p className="mt-1 text-sm text-muted-foreground">Not yet closed won or lost.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{wonCount}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Deals won</p>
            <p className="mt-1 text-sm text-muted-foreground">Eligible for cross-sell requests.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{crossSellOpen}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Open cross-sell</p>
            <p className="mt-1 text-sm text-muted-foreground">Pending or in progress servicing.</p>
          </div>
        </div>
      </section>

      <section className="table-shell">
        <div className="flex flex-col gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-heading text-xl font-semibold text-foreground">Referrals inbox</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sorted by most recently submitted · use tags and filters above to segment.
            </p>
          </div>
        </div>

        {unified.length === 0 ? (
          <div className="empty-state m-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-foreground">Nothing here yet</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              {kind === "cross_sell"
                ? "Submit a cross-sell from a won deal to see it in this list."
                : "Submit a new lead to Finanshels and track it here."}
            </p>
            <Link href="/dashboard/leads/new" className="primary-button mt-6">
              <Plus className="h-4 w-4" />
              Create referral
            </Link>
          </div>
        ) : viewMode === "kanban" && kind === "net_new" ? (
          <div className="overflow-x-auto p-4">
            <div className="flex min-w-max gap-4">
              {kanbanStatuses.map((statusItem) => {
                const bucketRows = kanbanBuckets.get(statusItem.key) ?? []
                return (
                  <div key={statusItem.key} className="w-[300px] flex-shrink-0 rounded-[1.2rem] border border-border bg-secondary/35">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                      <p className="text-sm font-semibold text-foreground">{statusItem.label}</p>
                      <span className="rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-xs text-muted-foreground">
                        {bucketRows.length}
                      </span>
                    </div>
                    <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
                      {bucketRows.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                          No leads
                        </p>
                      ) : (
                        bucketRows.map((lead) => {
                          const services = parseServices(lead.serviceInterest)
                          return (
                            <Link
                              key={lead.id}
                              href={`/dashboard/leads/${lead.id}`}
                              className="block rounded-xl border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary/70"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">{lead.customerName}</p>
                                <TypeBadge crossSell={false} />
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{lead.customerCompany || lead.customerEmail}</p>
                              <p className="mt-2 line-clamp-2 text-xs text-[var(--portal-text-soft)]">
                                {services.length > 0 ? services.join(", ") : "No services selected"}
                              </p>
                              <div className="mt-3 flex items-center justify-between">
                                <span
                                  className={`status-pill ${statusStyles[lead.status] ?? "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
                                >
                                  {formatLabel(lead.status)}
                                </span>
                                <span className="text-[11px] text-muted-foreground">{formatDate(lead.createdAt)}</span>
                              </div>
                            </Link>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
              {unknownStatusRows.length > 0 ? (
                <div className="w-[300px] flex-shrink-0 rounded-[1.2rem] border border-border bg-secondary/35">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <p className="text-sm font-semibold text-foreground">Other</p>
                    <span className="rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-xs text-muted-foreground">
                      {unknownStatusRows.length}
                    </span>
                  </div>
                  <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
                    {unknownStatusRows.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/dashboard/leads/${lead.id}`}
                        className="block rounded-xl border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary/70"
                      >
                        <p className="text-sm font-semibold text-foreground">{lead.customerName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{lead.customerCompany || lead.customerEmail}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : viewMode === "kanban" && kind === "cross_sell" ? (
          <div className="overflow-x-auto p-4">
            <div className="flex min-w-max gap-4">
              {requestKanbanKeys.map((col) => {
                const bucketRows = requestBuckets.get(col.key) ?? []
                return (
                  <div key={col.key} className="w-[300px] flex-shrink-0 rounded-[1.2rem] border border-border bg-secondary/35">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                      <p className="text-sm font-semibold text-foreground">{col.label}</p>
                      <span className="rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-xs text-muted-foreground">
                        {bucketRows.length}
                      </span>
                    </div>
                    <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
                      {bucketRows.map((row) => {
                        const svc = formatRequestServices(row.servicesList, row.serviceName)
                        return (
                          <Link
                            key={row.id}
                            href={`/dashboard/service-requests/${row.id}`}
                            className="block rounded-xl border border-violet-400/20 bg-violet-500/5 p-3 transition-colors hover:bg-violet-500/10"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">{row.customerCompany}</p>
                              <TypeBadge crossSell />
                            </div>
                            <p className="mt-2 line-clamp-2 text-xs text-[var(--portal-text-soft)]">
                              {svc.length > 0 ? svc.join(", ") : "—"}
                            </p>
                            <div className="mt-3 text-[11px] text-muted-foreground">{formatDate(row.createdAt)}</div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {unknownRequestRows.length > 0 ? (
                <div className="w-[300px] flex-shrink-0 rounded-[1.2rem] border border-border bg-secondary/35">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <p className="text-sm font-semibold text-foreground">Other</p>
                  </div>
                  <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
                    {unknownRequestRows.map((row) => (
                      <Link
                        key={row.id}
                        href={`/dashboard/service-requests/${row.id}`}
                        className="block rounded-xl border border-border bg-secondary/50 p-3"
                      >
                        {row.customerCompany}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : viewMode === "kanban" && kind === "all" ? (
          <div className="overflow-x-auto p-4">
            <div className="flex min-w-max gap-4">
              {kanbanStatuses.map((statusItem) => {
                const bucketRows = kanbanBuckets.get(statusItem.key) ?? []
                return (
                  <div key={statusItem.key} className="w-[300px] flex-shrink-0 rounded-[1.2rem] border border-border bg-secondary/35">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                      <p className="text-sm font-semibold text-foreground">{statusItem.label}</p>
                      <span className="rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-xs text-muted-foreground">
                        {bucketRows.length}
                      </span>
                    </div>
                    <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
                      {bucketRows.map((lead) => (
                        <Link
                          key={lead.id}
                          href={`/dashboard/leads/${lead.id}`}
                          className="block rounded-xl border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary/70"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{lead.customerName}</p>
                            <TypeBadge crossSell={false} />
                          </div>
                          <div className="mt-3">
                            <span
                              className={`status-pill ${statusStyles[lead.status] ?? "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
                            >
                              {formatLabel(lead.status)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
              <div className="w-[300px] flex-shrink-0 rounded-[1.2rem] border border-violet-400/25 bg-secondary/35">
                <div className="flex items-center justify-between border-b border-violet-400/25 px-3 py-2.5">
                  <p className="text-sm font-semibold text-violet-100">Cross-sell</p>
                  <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200">
                    {requestRows.length}
                  </span>
                </div>
                <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
                  {requestRows.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                      No cross-sell requests
                    </p>
                  ) : (
                    requestRows.map((row) => {
                      const svc = formatRequestServices(row.servicesList, row.serviceName)
                      return (
                        <Link
                          key={row.id}
                          href={`/dashboard/service-requests/${row.id}`}
                          className="block rounded-xl border border-violet-400/20 bg-violet-500/5 p-3 transition-colors hover:bg-violet-500/10"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{row.customerCompany}</p>
                            <TypeBadge crossSell />
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs text-[var(--portal-text-soft)]">
                            {svc.length > 0 ? svc.join(", ") : "—"}
                          </p>
                          <div className="mt-3">
                            <span
                              className={`status-pill ${requestStatusStyles[row.status] ?? "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
                            >
                              {formatLabel(row.status)}
                            </span>
                          </div>
                        </Link>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Services</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Submitted</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unified.map((row) => (
                    <tr
                      key={`${row.record}-${row.id}`}
                      className="border-b border-border transition-colors hover:bg-secondary/50"
                    >
                      <td className="px-6 py-4 align-middle">
                        <TypeBadge crossSell={row.record === "cross_sell"} />
                      </td>
                      <td className="px-6 py-4">
                        <Link href={row.href} className="group">
                          <p className="font-medium text-foreground group-hover:text-primary">{row.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{row.sub}</p>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {row.services.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.services.slice(0, 2).map((s) => (
                              <span
                                key={s}
                                className="status-pill border border-border bg-secondary/70 text-[var(--portal-text-soft)]"
                              >
                                {s}
                              </span>
                            ))}
                            {row.services.length > 2 ? (
                              <span className="status-pill border border-border bg-secondary/70 text-muted-foreground">
                                +{row.services.length - 2}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`status-pill ${
                            row.record === "lead"
                              ? statusStyles[row.status] ?? "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"
                              : requestStatusStyles[row.status] ??
                                "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"
                          }`}
                        >
                          {formatLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(row.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link href={row.href} className="text-xs font-medium text-primary hover:text-primary/80">
                          {row.actionLabel}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 md:hidden">
              {unified.map((row) => (
                <Link
                  key={`${row.record}-${row.id}`}
                  href={row.href}
                  className="block rounded-[1.5rem] border border-border bg-secondary/50 p-4 transition-colors hover:border-border hover:bg-secondary/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg font-semibold text-foreground">{row.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{row.sub}</p>
                    </div>
                    <TypeBadge crossSell={row.record === "cross_sell"} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`status-pill ${
                        row.record === "lead"
                          ? statusStyles[row.status] ?? "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"
                          : requestStatusStyles[row.status] ??
                            "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"
                      }`}
                    >
                      {formatLabel(row.status)}
                    </span>
                  </div>
                  {row.services.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {row.services.map((s) => (
                        <span
                          key={s}
                          className="status-pill border border-border bg-secondary/70 text-[var(--portal-text-soft)]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Submitted {formatDate(row.createdAt)}</p>
                    <span className="text-xs font-medium text-primary">{row.actionLabel}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
