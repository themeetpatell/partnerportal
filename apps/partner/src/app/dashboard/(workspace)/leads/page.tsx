import { db, leads } from "@repo/db"
import { and, desc, eq, isNull } from "drizzle-orm"
import Link from "next/link"
import { LayoutGrid, List, Plus, Users } from "lucide-react"
import { DatabaseFallbackCard } from "@/components/database-fallback-card"
import { getDatabaseErrorHost, isDatabaseConnectivityError } from "@/lib/database-error"
import { getCurrentPartnerRecord } from "@/lib/partner-record"

type InboxKind = "all" | "net_new" | "cross_sell"

/** Cap list fetch to keep navigation responsive (aligned with admin leads list). */
/** Keep inbox queries fast; totals still use separate count() queries. */
const PARTNER_PIPELINE_LIST_LIMIT = 200

function parseKind(value: string | undefined): InboxKind {
  if (value === "net_new" || value === "new") return "net_new"
  if (value === "cross_sell" || value === "existing") return "cross_sell"
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

const statusStyles: Record<string, string> = {
  submitted: "border border-border bg-secondary text-foreground/90",
  lead_approved: "border border-sky-500/25 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:text-sky-100",
  lead_follow_up: "border border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:border-cyan-400/20 dark:text-cyan-100",
  lead_qualified: "border border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400/20 dark:text-indigo-100",
  proposal_sent: "border border-primary/20 bg-primary/10 text-primary",
  deal_won: "border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-100",
  deal_lost: "border border-border bg-secondary/60 text-muted-foreground",
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

function qs(p: Record<string, string | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== "") sp.set(k, v)
  }
  return sp.toString()
}

function IntakeBadge({ intakeType }: { intakeType: string | null | undefined }) {
  const isExisting = intakeType === "existing_lead"
  return (
    <span
      className={`status-pill ${
        isExisting
          ? "border border-violet-500/25 bg-violet-500/10 text-violet-700 dark:border-violet-400/25 dark:text-violet-100"
          : "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"
      }`}
    >
      {isExisting ? "Existing lead" : "New lead"}
    </span>
  )
}

/** Kanban column already shows pipeline stage — do not repeat status on the card. */
function PartnerLeadKanbanCard({ lead }: { lead: LeadRow }) {
  const services = parseServices(lead.serviceInterest)
  const servicesText = services.length > 0 ? services.join(", ") : "—"
  const phone = lead.customerPhone?.trim() || "—"
  const companyLine = lead.customerCompany?.trim() || lead.customerEmail

  return (
    <Link
      href={`/dashboard/leads/${lead.id}`}
      className="block rounded-xl border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary/70"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{lead.customerName}</p>
        <IntakeBadge intakeType={lead.intakeType} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{companyLine}</p>
      <dl className="mt-2.5 space-y-2 text-xs">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Phone</dt>
          <dd className="mt-0.5 text-[var(--portal-text-soft)]">{phone}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Services</dt>
          <dd className="mt-0.5 line-clamp-3 text-[var(--portal-text-soft)]">{servicesText}</dd>
        </div>
      </dl>
      <p className="mt-2.5 text-right text-[11px] text-muted-foreground">{formatDate(lead.createdAt)}</p>
    </Link>
  )
}

type LeadRow = typeof leads.$inferSelect
type UnifiedRow = {
  id: string
  intakeType: string | null
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

  try {
    if (partner) {
      const intakeClause =
        kind === "net_new"
          ? eq(leads.intakeType, "new_lead")
          : kind === "cross_sell"
            ? eq(leads.intakeType, "existing_lead")
            : undefined
      const leadStatusFilter = status ? eq(leads.status, status) : undefined

      leadRows = await db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.partnerId, partner.id),
            isNull(leads.deletedAt),
            intakeClause,
            leadStatusFilter,
          ),
        )
        .orderBy(desc(leads.createdAt))
        .limit(PARTNER_PIPELINE_LIST_LIMIT)
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

  const unified: UnifiedRow[] = leadRows.map((lead) => ({
    id: lead.id,
    intakeType: lead.intakeType,
    title: lead.customerName,
    sub: [lead.customerCompany, lead.customerEmail].filter(Boolean).join(" · ") || lead.customerEmail,
    createdAt: lead.createdAt,
    status: lead.status,
    services: parseServices(lead.serviceInterest),
    href: `/dashboard/leads/${lead.id}`,
    actionLabel: "Open lead",
  }))

  unified.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const openCount = leadRows.filter((r) => !["deal_won", "deal_lost"].includes(r.status)).length
  const wonCount = leadRows.filter((r) => r.status === "deal_won").length
  const existingOpen = leadRows.filter(
    (r) =>
      r.intakeType === "existing_lead" && !["deal_won", "deal_lost"].includes(r.status),
  ).length

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

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-[2rem] px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">Leads to Finanshels</div>
            <h1 className="page-title mt-5">Leads</h1>
            <p className="page-subtitle mt-3 max-w-2xl">
              One inbox for new introductions and follow-ons from clients you already closed. Filter by New vs Existing
              and by pipeline stage.
            </p>
          </div>
          <Link href="/dashboard/leads/new" className="primary-button w-full justify-center sm:w-auto">
            <Plus className="h-4 w-4" />
            Submit a lead
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
              Existing leads
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

        <div className="mt-4 inline-flex flex-wrap rounded-xl border border-border bg-secondary/50 p-1">
          {pipelineTabs.map((tab) => {
            const active = status === tab.value || (!tab.value && !status)
            return (
              <Link
                key={tab.label}
                href={`/dashboard/leads?${qs({
                  ...(kind !== "all" ? { kind } : {}),
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

        {kind === "all" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Pipeline filters apply to <span className="font-medium text-foreground">both</span> new and existing-client
            leads in this combined list.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="metric-card">
            <p className="metric-value">{unified.length}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Inbox items</p>
            <p className="mt-1 text-sm text-muted-foreground">Everything in your current filters.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{openCount}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Pipeline (new leads)</p>
            <p className="mt-1 text-sm text-muted-foreground">Not yet closed won or lost.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{wonCount}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Deals won</p>
            <p className="mt-1 text-sm text-muted-foreground">Eligible to spin up another existing-client lead.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{existingOpen}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Open existing-client</p>
            <p className="mt-1 text-sm text-muted-foreground">Follow-on leads still in the pipeline.</p>
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
                ? "Submit follow-on work from a won deal to populate this list."
                : "Submit a new lead to Finanshels and track it here."}
            </p>
            <Link href="/dashboard/leads/new" className="primary-button mt-6">
              <Plus className="h-4 w-4" />
              Create referral
            </Link>
          </div>
        ) : viewMode === "kanban" ? (
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
                        bucketRows.map((lead) => <PartnerLeadKanbanCard key={lead.id} lead={lead} />)
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
                      <PartnerLeadKanbanCard key={lead.id} lead={lead} />
                    ))}
                  </div>
                </div>
              ) : null}
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
                      key={row.id}
                      className="border-b border-border transition-colors hover:bg-secondary/50"
                    >
                      <td className="px-6 py-4 align-middle">
                        <IntakeBadge intakeType={row.intakeType} />
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
                            statusStyles[row.status] ??
                            "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"
                          }`}
                        >
                          {formatLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(row.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link href={row.href} className="secondary-button h-9 px-3 text-xs">
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
                  key={row.id}
                  href={row.href}
                  className="block rounded-[1.5rem] border border-border bg-secondary/50 p-4 transition-colors hover:border-border hover:bg-secondary/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg font-semibold text-foreground">{row.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{row.sub}</p>
                    </div>
                    <IntakeBadge intakeType={row.intakeType} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`status-pill ${
                        statusStyles[row.status] ??
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
                    <span className="secondary-button h-9 px-3 text-xs">{row.actionLabel}</span>
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
