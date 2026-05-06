import Link from "next/link"
import { currentUser } from "@repo/auth/server"
import { db, leads, partners, serviceRequests, services } from "@repo/db"
import { and, count, desc, eq, isNull } from "drizzle-orm"
import { Users, ArrowRight, Plus, ClipboardList, LayoutGrid, List } from "lucide-react"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { partnerScopeWhere, resolvePartnerScopeForActor, scopedPartnerFilters } from "@/lib/row-scope"

type InboxKind = "all" | "net_new" | "cross_sell"

function parseKind(value: string | undefined): InboxKind {
  if (value === "net_new" || value === "cross_sell") return value
  return "all"
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    lead_approved: "bg-sky-950/60 border-sky-800/40 text-sky-400",
    lead_follow_up: "bg-cyan-950/60 border-cyan-800/40 text-cyan-400",
    lead_qualified: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
    proposal_sent: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    deal_won: "bg-green-950/60 border-green-800/40 text-green-400",
    deal_lost: "bg-red-950/60 border-red-800/40 text-red-400",
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${map[status] ?? "bg-zinc-800 border-zinc-700 text-zinc-400"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}

function RequestStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    in_progress: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    completed: "bg-green-950/60 border-green-800/40 text-green-400",
    cancelled: "bg-red-950/60 border-red-800/40 text-red-400",
  }
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize ${map[status] ?? "border-zinc-700 bg-zinc-800 text-zinc-400"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}

function LeadTypeBadge({ crossSell }: { crossSell: boolean }) {
  if (crossSell) {
    return (
      <span className="inline-flex items-center rounded border border-violet-800/50 bg-violet-950/40 px-2 py-0.5 text-[11px] font-medium text-violet-200">
        Cross-sell
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
      New lead
    </span>
  )
}

const pipelineTabs = [
  { label: "All", value: undefined },
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
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
] as const

type UnifiedRow =
  | {
      kind: "lead"
      id: string
      createdAt: Date
      customerTitle: string
      customerSub: string
      partnerCompanyName: string | null
      partnerContactName: string | null
      services: string
      status: string
      assignedTo: string | null
      href: string
    }
  | {
      kind: "cross_sell"
      id: string
      createdAt: Date
      customerTitle: string
      customerSub: string
      partnerCompanyName: string | null
      partnerContactName: string | null
      services: string
      status: string
      assignedTo: string | null
      href: string
    }

function formatLeadServices(raw: string) {
  try {
    const parsed = JSON.parse(raw) as string[]
    return parsed.join(", ")
  } catch {
    return raw
  }
}

function formatRequestServices(rawList: string | null, serviceName: string | null) {
  if (rawList) {
    try {
      const parsed = JSON.parse(rawList)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.join(", ")
      }
    } catch {
      // fall through
    }
  }
  return serviceName || "—"
}

function formatPartnerName(
  company: string | null | undefined,
  contact: string | null | undefined,
) {
  const c = company?.trim()
  const n = contact?.trim()
  if (c && n) return `${c} · ${n}`
  return c || n || "—"
}

function LeadKanbanCard({
  lead,
}: {
  lead: {
    id: string
    customerName: string
    customerEmail: string
    customerCompany: string | null
    customerPhone: string | null
    serviceInterest: string
    createdAt: Date
    partnerCompanyName: string | null
    partnerContactName: string | null
  }
}) {
  const services = formatLeadServices(lead.serviceInterest)
  const phone = lead.customerPhone?.trim() || "—"
  const partner = formatPartnerName(lead.partnerCompanyName, lead.partnerContactName)
  const companyLine = lead.customerCompany?.trim() || lead.customerEmail

  return (
    <Link
      href={`/leads/${lead.id}`}
      className="block rounded-lg border border-zinc-800 bg-zinc-900 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-100">{lead.customerName}</p>
        <LeadTypeBadge crossSell={false} />
      </div>
      <p className="mt-1 text-xs text-zinc-400">{companyLine}</p>
      <dl className="mt-2.5 space-y-2 text-xs">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Phone</dt>
          <dd className="mt-0.5 text-zinc-300">{phone}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Partner</dt>
          <dd className="mt-0.5 text-zinc-300">{partner}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Services</dt>
          <dd className="mt-0.5 line-clamp-3 text-zinc-300">{services || "—"}</dd>
        </div>
      </dl>
      <p className="mt-2.5 text-right text-[11px] text-zinc-500">
        {new Date(lead.createdAt).toLocaleDateString("en-AE", {
          day: "numeric",
          month: "short",
        })}
      </p>
    </Link>
  )
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    page?: string
    partnerId?: string
    view?: string
    kind?: string
  }>
}) {
  const { status, page, partnerId, view, kind: kindParam } = await searchParams
  const kind = parseKind(kindParam)
  const viewMode = view === "kanban" ? "kanban" : "table"
  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1)
  const pageSize = 50
  const pageOffset = viewMode === "table" ? (pageNum - 1) * pageSize : 0

  const [member, actor] = await Promise.all([
    getCurrentActiveTeamMember(),
    currentUser(),
  ])
  const tenantId = getRequiredTenantId()
  const scope =
    actor?.id === undefined
      ? ({ kind: "restricted" as const, partnerIds: [] as readonly string[] })
      : await resolvePartnerScopeForActor({
          tenantId,
          actorUserId: actor.id,
          member,
        })

  const scopeClause = scopedPartnerFilters(scope, leads.partnerId, partnerId)
  const requestScopeClause = partnerScopeWhere(scope, serviceRequests.partnerId)

  const leadStatusFilter =
    kind !== "cross_sell" && status ? eq(leads.status, status) : undefined

  const requestStatusFilter =
    kind === "cross_sell" && status ? eq(serviceRequests.status, status) : undefined

  const leadWhereClause = and(
    eq(leads.tenantId, tenantId),
    isNull(leads.deletedAt),
    scopeClause ?? undefined,
    leadStatusFilter,
  )

  const requestWhereClause = and(
    eq(serviceRequests.tenantId, tenantId),
    isNull(serviceRequests.deletedAt),
    requestScopeClause ?? undefined,
    requestStatusFilter,
  )

  const countLeadWhere = leadWhereClause
  const countRequestWhere = requestWhereClause

  const [leadRowsRaw, requestRowsRaw, leadCountResult, requestCountResult] = await Promise.all([
    kind === "cross_sell"
      ? Promise.resolve(
          [] as {
            id: string
            customerName: string
            customerEmail: string
            customerCompany: string | null
            customerPhone: string | null
            serviceInterest: string
            status: string
            assignedTo: string | null
            createdAt: Date
            partnerId: string
            partnerCompanyName: string | null
            partnerContactName: string | null
          }[],
        )
      : db
          .select({
            id: leads.id,
            customerName: leads.customerName,
            customerEmail: leads.customerEmail,
            customerCompany: leads.customerCompany,
            customerPhone: leads.customerPhone,
            serviceInterest: leads.serviceInterest,
            status: leads.status,
            assignedTo: leads.assignedTo,
            createdAt: leads.createdAt,
            partnerId: leads.partnerId,
            partnerCompanyName: partners.companyName,
            partnerContactName: partners.contactName,
          })
          .from(leads)
          .leftJoin(partners, eq(leads.partnerId, partners.id))
          .where(leadWhereClause)
          .orderBy(desc(leads.createdAt), desc(leads.updatedAt))
          .limit(500),
    kind === "net_new"
      ? Promise.resolve(
          [] as {
            id: string
            customerCompany: string
            customerContact: string
            customerEmail: string
            status: string
            createdAt: Date
            assignedTo: string | null
            partnerCompanyName: string | null
            partnerContactName: string | null
            serviceName: string | null
            servicesList: string | null
          }[],
        )
      : db
          .select({
            id: serviceRequests.id,
            customerCompany: serviceRequests.customerCompany,
            customerContact: serviceRequests.customerContact,
            customerEmail: serviceRequests.customerEmail,
            status: serviceRequests.status,
            createdAt: serviceRequests.createdAt,
            assignedTo: serviceRequests.assignedTo,
            partnerCompanyName: partners.companyName,
            partnerContactName: partners.contactName,
            serviceName: services.name,
            servicesList: serviceRequests.servicesList,
          })
          .from(serviceRequests)
          .leftJoin(partners, eq(serviceRequests.partnerId, partners.id))
          .leftJoin(services, eq(serviceRequests.serviceId, services.id))
          .where(requestWhereClause)
          .orderBy(desc(serviceRequests.createdAt))
          .limit(500),
    kind === "cross_sell" ? Promise.resolve([{ total: 0 }]) : db.select({ total: count() }).from(leads).where(countLeadWhere),
    kind === "net_new"
      ? Promise.resolve([{ total: 0 }])
      : db.select({ total: count() }).from(serviceRequests).where(countRequestWhere),
  ])

  const unified: UnifiedRow[] = []

  for (const lead of leadRowsRaw) {
    unified.push({
      kind: "lead",
      id: lead.id,
      createdAt: lead.createdAt,
      customerTitle: lead.customerName,
      customerSub: lead.customerCompany || lead.customerEmail,
      partnerCompanyName: lead.partnerCompanyName,
      partnerContactName: lead.partnerContactName,
      services: formatLeadServices(lead.serviceInterest),
      status: lead.status,
      assignedTo: lead.assignedTo,
      href: `/leads/${lead.id}`,
    })
  }

  for (const row of requestRowsRaw) {
    unified.push({
      kind: "cross_sell",
      id: row.id,
      createdAt: row.createdAt,
      customerTitle: row.customerCompany,
      customerSub: `${row.customerContact} · ${row.customerEmail}`,
      partnerCompanyName: row.partnerCompanyName,
      partnerContactName: row.partnerContactName,
      services: formatRequestServices(row.servicesList, row.serviceName),
      status: row.status,
      assignedTo: row.assignedTo,
      href: `/service-requests/${row.id}`,
    })
  }

  unified.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const total = unified.length
  const pagedRows = viewMode === "table" ? unified.slice(pageOffset, pageOffset + pageSize) : unified

  const leadTotal = leadCountResult[0]?.total ?? 0
  const requestTotal = requestCountResult[0]?.total ?? 0

  const kanbanStatuses = pipelineTabs.flatMap((tab) =>
    tab.value ? [{ key: tab.value, label: tab.label }] : [],
  )

  const kanbanBuckets = new Map<string, typeof leadRowsRaw>(kanbanStatuses.map((s) => [s.key, []]))
  const unknownStatusRows: typeof leadRowsRaw = []
  for (const lead of leadRowsRaw) {
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
  const requestBuckets = new Map<string, typeof requestRowsRaw>(requestKanbanKeys.map((k) => [k.key, []]))
  const unknownRequestRows: typeof requestRowsRaw = []
  for (const r of requestRowsRaw) {
    const b = requestBuckets.get(r.status)
    if (b) b.push(r)
    else unknownRequestRows.push(r)
  }

  function qs(p: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(p)) {
      if (v !== undefined && v !== "") sp.set(k, v)
    }
    return sp.toString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Partner pipeline and cross-sell requests in one place — filter like a CRM workspace.
          </p>
          {partnerId ? (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-indigo-800/40 bg-indigo-950/20 px-3 py-2 text-xs text-indigo-200 w-fit">
              <span>Showing leads for one partner</span>
              <Link href="/leads" className="font-medium text-indigo-300 hover:text-white transition-colors">
                Clear filter
              </Link>
            </div>
          ) : null}
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-1">
            <Link
              href={`/leads?${qs({
                ...(status ? { status } : {}),
                ...(partnerId ? { partnerId } : {}),
                view: "table",
                ...(kind !== "all" ? { kind } : {}),
              })}`}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "table" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </Link>
            <Link
              href={`/leads?${qs({
                ...(status ? { status } : {}),
                ...(partnerId ? { partnerId } : {}),
                view: "kanban",
                ...(kind !== "all" ? { kind } : {}),
              })}`}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "kanban" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </Link>
          </div>
          <Link
            href="/leads/new?leadType=existing"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            <ClipboardList className="h-4 w-4" />
            Cross-sell intake
          </Link>
          <Link
            href="/leads/new"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            New lead
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 w-fit">
        {(
          [
            { label: "All activity", value: "all" as const },
            { label: "New leads", value: "net_new" as const },
            { label: "Cross-sell", value: "cross_sell" as const },
          ] as const
        ).map((tab) => {
          const isActive = kind === tab.value
          return (
            <Link
              key={tab.value}
              href={`?${qs({
                kind: tab.value === "all" ? undefined : tab.value,
                ...(partnerId ? { partnerId } : {}),
                ...(viewMode ? { view: viewMode } : {}),
              })}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {kind === "cross_sell" ? (
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit flex-wrap">
          {requestTabs.map((tab) => {
            const isActive = status === tab.value || (!status && !tab.value)
            return (
              <Link
                key={tab.label}
                href={`?${qs({
                  kind: "cross_sell",
                  ...(tab.value ? { status: tab.value } : {}),
                  ...(partnerId ? { partnerId } : {}),
                  ...(viewMode ? { view: viewMode } : {}),
                })}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit flex-wrap">
          {pipelineTabs.map((tab) => {
            const isActive = status === tab.value || (!status && !tab.value)
            return (
              <Link
                key={tab.label}
                href={`?${qs({
                  ...(kind === "net_new" ? { kind: "net_new" } : {}),
                  ...(tab.value ? { status: tab.value } : {}),
                  ...(partnerId ? { partnerId } : {}),
                  ...(viewMode ? { view: viewMode } : {}),
                })}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        {kind === "all"
          ? `Showing ${total} combined records (${leadTotal} new leads, ${requestTotal} cross-sell). Pipeline tabs filter new leads only; cross-sell rows stay visible.`
          : kind === "net_new"
            ? `${leadTotal} new lead${leadTotal === 1 ? "" : "s"}`
            : `${requestTotal} cross-sell request${requestTotal === 1 ? "" : "s"}`}
      </p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {unified.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium text-sm">Nothing in this view</p>
            <p className="text-zinc-600 text-xs mt-1">
              {kind === "cross_sell"
                ? "Cross-sell requests will appear when partners submit follow-on work for won deals."
                : "Leads submitted by partners will appear here."}
            </p>
          </div>
        ) : viewMode === "kanban" && kind === "net_new" ? (
          <div className="overflow-x-auto p-4">
            <div className="flex min-w-max gap-4">
              {kanbanStatuses.map((statusItem) => {
                const bucketRows = kanbanBuckets.get(statusItem.key) ?? []
                return (
                  <div key={statusItem.key} className="w-[300px] flex-shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/60">
                    <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                      <p className="text-sm font-semibold text-zinc-200">{statusItem.label}</p>
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">
                        {bucketRows.length}
                      </span>
                    </div>
                    <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
                      {bucketRows.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center text-xs text-zinc-600">
                          No leads
                        </p>
                      ) : (
                        bucketRows.map((lead) => <LeadKanbanCard key={lead.id} lead={lead} />)
                      )}
                    </div>
                  </div>
                )
              })}
              {unknownStatusRows.length > 0 ? (
                <div className="w-[300px] flex-shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/60">
                  <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                    <p className="text-sm font-semibold text-zinc-200">Other</p>
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">
                      {unknownStatusRows.length}
                    </span>
                  </div>
                  <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
                    {unknownStatusRows.map((lead) => <LeadKanbanCard key={lead.id} lead={lead} />)}
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
                  <div key={col.key} className="w-[300px] flex-shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/60">
                    <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                      <p className="text-sm font-semibold text-zinc-200">{col.label}</p>
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">
                        {bucketRows.length}
                      </span>
                    </div>
                    <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
                      {bucketRows.map((row) => (
                        <Link
                          key={row.id}
                          href={`/service-requests/${row.id}`}
                          className="block rounded-lg border border-violet-900/40 bg-violet-950/20 p-3 transition-colors hover:border-violet-800/60"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-zinc-100">{row.customerCompany}</p>
                            <LeadTypeBadge crossSell />
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">
                            {row.customerContact} · {row.customerEmail}
                          </p>
                          <p className="mt-2 line-clamp-2 text-xs text-zinc-400">
                            {formatRequestServices(row.servicesList, row.serviceName)}
                          </p>
                          <div className="mt-3 text-[11px] text-zinc-500">
                            {new Date(row.createdAt).toLocaleDateString("en-AE", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
              {unknownRequestRows.length > 0 ? (
                <div className="w-[300px] flex-shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/60">
                  <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                    <p className="text-sm font-semibold text-zinc-200">Other</p>
                  </div>
                  <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
                    {unknownRequestRows.map((row) => (
                      <Link
                        key={row.id}
                        href={`/service-requests/${row.id}`}
                        className="block rounded-lg border border-zinc-800 bg-zinc-900 p-3"
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
                  <div key={statusItem.key} className="w-[300px] flex-shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/60">
                    <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                      <p className="text-sm font-semibold text-zinc-200">{statusItem.label}</p>
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">
                        {bucketRows.length}
                      </span>
                    </div>
                    <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
                      {bucketRows.map((lead) => <LeadKanbanCard key={lead.id} lead={lead} />)}
                    </div>
                  </div>
                )
              })}
              <div className="w-[300px] flex-shrink-0 rounded-xl border border-violet-900/35 bg-zinc-950/60">
                <div className="flex items-center justify-between border-b border-violet-900/35 px-3 py-2">
                  <p className="text-sm font-semibold text-violet-200">Cross-sell</p>
                  <span className="rounded-full border border-violet-800/40 bg-violet-950/40 px-2 py-0.5 text-xs text-violet-300">
                    {requestRowsRaw.length}
                  </span>
                </div>
                <div className="max-h-[62vh] space-y-3 overflow-y-auto p-3">
                  {requestRowsRaw.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center text-xs text-zinc-600">
                      No cross-sell requests
                    </p>
                  ) : (
                    requestRowsRaw.map((row) => (
                      <Link
                        key={row.id}
                        href={`/service-requests/${row.id}`}
                        className="block rounded-lg border border-violet-900/40 bg-violet-950/20 p-3 transition-colors hover:border-violet-800/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-zinc-100">{row.customerCompany}</p>
                          <LeadTypeBadge crossSell />
                        </div>
                        <p className="mt-2 text-xs text-zinc-400">
                          {formatRequestServices(row.servicesList, row.serviceName)}
                        </p>
                        <div className="mt-3">
                          <RequestStatusBadge status={row.status} />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Services
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {pagedRows.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4 align-middle">
                      <LeadTypeBadge crossSell={row.kind === "cross_sell"} />
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-200 text-sm font-medium">{row.customerTitle}</p>
                      <p className="text-zinc-500 text-xs">{row.customerSub}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-300 text-sm">{row.partnerCompanyName || row.partnerContactName || "—"}</p>
                      {row.partnerCompanyName && row.partnerContactName ? (
                        <p className="text-zinc-500 text-xs">{row.partnerContactName}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-400 text-sm truncate max-w-[160px]">{row.services || "—"}</p>
                    </td>
                    <td className="px-6 py-4">
                      {row.kind === "lead" ? (
                        <StatusBadge status={row.status} />
                      ) : (
                        <RequestStatusBadge status={row.status} />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-500 text-sm">
                        {new Date(row.createdAt).toLocaleDateString("en-AE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-500 text-sm">
                        {row.assignedTo ? (
                          <span className="text-zinc-300">{row.assignedTo.slice(0, 8)}…</span>
                        ) : (
                          <span className="text-zinc-600">Unassigned</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={row.href}
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        Open
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {viewMode === "table" && total > pageSize && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800">
            <p className="text-zinc-500 text-sm">
              Showing {pageOffset + 1}–{Math.min(pageOffset + pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              {pageNum > 1 && (
                <Link
                  href={`?${qs({
                    ...(kind !== "all" ? { kind } : {}),
                    ...(status ? { status } : {}),
                    ...(partnerId ? { partnerId } : {}),
                    ...(viewMode ? { view: viewMode } : {}),
                    page: String(pageNum - 1),
                  })}`}
                  className="px-3 py-1.5 rounded-md text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  Previous
                </Link>
              )}
              {pageOffset + pageSize < total && (
                <Link
                  href={`?${qs({
                    ...(kind !== "all" ? { kind } : {}),
                    ...(status ? { status } : {}),
                    ...(partnerId ? { partnerId } : {}),
                    ...(viewMode ? { view: viewMode } : {}),
                    page: String(pageNum + 1),
                  })}`}
                  className="px-3 py-1.5 rounded-md text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
