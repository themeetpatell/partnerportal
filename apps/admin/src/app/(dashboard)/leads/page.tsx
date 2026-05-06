import Link from "next/link"
import { currentUser } from "@repo/auth/server"
import { db, leads, partners } from "@repo/db"
import { and, count, desc, eq, isNull } from "drizzle-orm"
import { Users, ArrowRight, Plus, ClipboardList, LayoutGrid, List } from "lucide-react"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { resolvePartnerScopeForActor, scopedPartnerFilters } from "@/lib/row-scope"

/** Keep inbox queries fast; totals still use separate count() queries. */
const ADMIN_INBOX_LIST_LIMIT = 200

type InboxKind = "all" | "net_new" | "cross_sell"

function parseKind(value: string | undefined): InboxKind {
  if (value === "net_new" || value === "new") return "net_new"
  if (value === "cross_sell" || value === "existing") return "cross_sell"
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

function IntakeBadge({ intakeType }: { intakeType: string | null | undefined }) {
  const isExisting = intakeType === "existing_lead"
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${
        isExisting
          ? "border-violet-800/50 bg-violet-950/40 text-violet-200"
          : "border-zinc-700 bg-zinc-800/80 text-zinc-300"
      }`}
    >
      {isExisting ? "Existing lead" : "New lead"}
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

type UnifiedRow = {
  id: string
  intakeType: string | null
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
    intakeType: string | null
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
        <IntakeBadge intakeType={lead.intakeType} />
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

  const intakeClause =
    kind === "net_new"
      ? eq(leads.intakeType, "new_lead")
      : kind === "cross_sell"
        ? eq(leads.intakeType, "existing_lead")
        : undefined

  const leadStatusFilter = status ? eq(leads.status, status) : undefined

  const leadWhereClause = and(
    eq(leads.tenantId, tenantId),
    isNull(leads.deletedAt),
    scopeClause ?? undefined,
    intakeClause,
    leadStatusFilter,
  )

  const countWhere = and(
    eq(leads.tenantId, tenantId),
    isNull(leads.deletedAt),
    scopeClause ?? undefined,
    intakeClause,
    leadStatusFilter,
  )

  const baseInboxWhere = and(eq(leads.tenantId, tenantId), isNull(leads.deletedAt), scopeClause ?? undefined)

  const [leadRowsRaw, leadCountResult, countNewInbox, countExistingInbox] = await Promise.all([
    db
      .select({
        id: leads.id,
        customerName: leads.customerName,
        customerEmail: leads.customerEmail,
        customerCompany: leads.customerCompany,
        customerPhone: leads.customerPhone,
        serviceInterest: leads.serviceInterest,
        intakeType: leads.intakeType,
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
      .limit(ADMIN_INBOX_LIST_LIMIT),
    db.select({ total: count() }).from(leads).where(countWhere),
    db
      .select({ total: count() })
      .from(leads)
      .where(and(baseInboxWhere, eq(leads.intakeType, "new_lead"), leadStatusFilter)),
    db
      .select({ total: count() })
      .from(leads)
      .where(and(baseInboxWhere, eq(leads.intakeType, "existing_lead"), leadStatusFilter)),
  ])

  const unified: UnifiedRow[] = leadRowsRaw.map((lead) => ({
    id: lead.id,
    intakeType: lead.intakeType,
    createdAt: lead.createdAt,
    customerTitle: lead.customerName,
    customerSub: lead.customerCompany || lead.customerEmail,
    partnerCompanyName: lead.partnerCompanyName,
    partnerContactName: lead.partnerContactName,
    services: formatLeadServices(lead.serviceInterest),
    status: lead.status,
    assignedTo: lead.assignedTo,
    href: `/leads/${lead.id}`,
  }))

  unified.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const total = unified.length
  const pagedRows = viewMode === "table" ? unified.slice(pageOffset, pageOffset + pageSize) : unified

  const leadTotal = leadCountResult[0]?.total ?? 0
  const newLeadInboxTotal = countNewInbox[0]?.total ?? 0
  const existingLeadInboxTotal = countExistingInbox[0]?.total ?? 0

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
            One lead inbox — tag is either new or existing client; same pipeline for both.
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
            Existing client intake
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
            { label: "Existing leads", value: "cross_sell" as const },
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

      <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 w-fit">
        {pipelineTabs.map((tab) => {
          const isActive = status === tab.value || (!status && !tab.value)
          return (
            <Link
              key={tab.label}
              href={`?${qs({
                ...(kind !== "all" ? { kind } : {}),
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

      <p className="text-xs text-zinc-500">
        {kind === "all"
          ? `Showing ${total} in this view (${newLeadInboxTotal} new, ${existingLeadInboxTotal} existing). Pipeline filters apply to both.`
          : kind === "net_new"
            ? `${leadTotal} new lead${leadTotal === 1 ? "" : "s"}`
            : `${leadTotal} existing lead${leadTotal === 1 ? "" : "s"}`}
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
                ? "Existing-client leads show when partners (or you) submit follow-on work from a won deal."
                : "Partner submissions land here."}
            </p>
          </div>
        ) : viewMode === "kanban" ? (
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
                  <tr key={row.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4 align-middle">
                      <IntakeBadge intakeType={row.intakeType} />
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
                      <StatusBadge status={row.status} />
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
