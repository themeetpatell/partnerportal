import { currentUser } from "@repo/auth/server"
import {
  db,
  leads,
  partnerClients,
  partners,
  serviceRequests,
  services,
} from "@repo/db"
import { and, desc, eq, isNull } from "drizzle-orm"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react"
import { buildClientRecords } from "@/lib/client-records"
import { DatabaseFallbackCard } from "@/components/database-fallback-card"
import { getDatabaseErrorHost, isDatabaseConnectivityError } from "@/lib/database-error"

const CLIENTS_PER_PAGE = 12

const leadStatusStyles: Record<string, string> = {
  submitted: "border border-zinc-300/20 bg-zinc-300/10 text-zinc-100",
  qualified: "border border-zinc-500/20 bg-zinc-500/10 text-zinc-100",
  proposal_sent: "border border-zinc-600/20 bg-zinc-600/10 text-zinc-100",
  deal_won: "border border-white/20 bg-white/10 text-white",
  deal_lost: "border border-zinc-700/20 bg-zinc-700/10 text-zinc-300",
}

const requestStatusStyles: Record<string, string> = {
  pending: "border border-zinc-300/20 bg-zinc-300/10 text-zinc-100",
  in_progress: "border border-zinc-400/20 bg-zinc-400/10 text-zinc-100",
  completed: "border border-white/20 bg-white/10 text-white",
  cancelled: "border border-zinc-600/20 bg-zinc-500/10 text-zinc-300",
}

const clientStatusStyles: Record<string, string> = {
  active: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  watchlist: "border border-amber-400/20 bg-amber-500/10 text-amber-100",
  inactive: "border border-zinc-500/20 bg-zinc-500/10 text-zinc-200",
}

const renewalStyles: Record<string, string> = {
  overdue: "border border-rose-400/20 bg-rose-500/10 text-rose-100",
  due_soon: "border border-amber-400/20 bg-amber-500/10 text-amber-100",
  upcoming: "border border-sky-400/20 bg-sky-500/10 text-sky-100",
  not_set: "border border-white/10 bg-white/[0.05] text-slate-300",
}

type ClientRecord = ReturnType<typeof buildClientRecords>[number]

function formatDate(date: Date | null) {
  if (!date) {
    return "Recently"
  }

  return new Date(date).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ")
}

function getRenewalLabel(renewalDate: Date | null, renewalState: string) {
  if (!renewalDate) {
    return "Not tracked"
  }

  if (renewalState === "overdue") {
    return `Overdue · ${formatDate(renewalDate)}`
  }

  if (renewalState === "due_soon") {
    return `Due soon · ${formatDate(renewalDate)}`
  }

  return formatDate(renewalDate)
}

function buildLeadHref(client: {
  displayName: string
  contactName: string | null
  email: string | null
  phone: string | null
}) {
  const params = new URLSearchParams()
  if (client.displayName) params.set("company", client.displayName)
  if (client.contactName) params.set("contactName", client.contactName)
  if (client.email) params.set("email", client.email)
  if (client.phone) params.set("phone", client.phone)
  return `/dashboard/leads/new?${params.toString()}`
}

function buildSaveHref(client: {
  displayName: string
  contactName: string | null
  email: string | null
  phone: string | null
  city: string | null
  country: string | null
}) {
  const params = new URLSearchParams()
  params.set("company", client.displayName)
  if (client.contactName) params.set("contactName", client.contactName)
  if (client.email) params.set("email", client.email)
  if (client.phone) params.set("phone", client.phone)
  if (client.city) params.set("city", client.city)
  if (client.country) params.set("country", client.country)
  return `/dashboard/clients/new?${params.toString()}`
}

function buildClientDetailHref(client: { key: string }) {
  return `/dashboard/clients/${encodeURIComponent(client.key)}`
}

function normalizeSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function buildClientsPageHref({
  page,
  scope,
  query,
}: {
  page?: number
  scope?: string
  query?: string
}) {
  const params = new URLSearchParams()
  if (scope && scope !== "all") params.set("scope", scope)
  if (query?.trim()) params.set("q", query.trim())
  if (page && page > 1) params.set("page", String(page))
  const search = params.toString()
  return search ? `/dashboard/clients?${search}` : "/dashboard/clients"
}

function clientMatchesQuery(client: ClientRecord, query: string) {
  if (!query.trim()) return true

  const haystack = [
    client.displayName,
    client.contactName,
    client.email,
    client.phone,
    client.city,
    client.country,
    client.nationality,
    client.tradeLicenseNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return haystack.includes(query.trim().toLowerCase())
}

function PaginationButton({
  href,
  disabled,
  children,
}: {
  href: string
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span className="secondary-button h-10 cursor-default px-3 opacity-45">
        {children}
      </span>
    )
  }

  return (
    <Link href={href} className="secondary-button h-10 px-3">
      {children}
    </Link>
  )
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; scope?: string; q?: string }>
}) {
  const { page, scope, q } = await searchParams
  const user = await currentUser()
  let clients = [] as ReturnType<typeof buildClientRecords>

  try {
    if (user) {
      const [partner] = await db
        .select()
        .from(partners)
        .where(eq(partners.authUserId, user.id))
        .limit(1)

      if (partner) {
        const [savedClientRows, leadRows, requestRows] = await Promise.all([
          db
            .select({
              id: partnerClients.id,
              companyName: partnerClients.companyName,
              contactName: partnerClients.contactName,
              email: partnerClients.email,
              phone: partnerClients.phone,
              nationality: partnerClients.nationality,
              tradeLicenseNumber: partnerClients.tradeLicenseNumber,
              city: partnerClients.city,
              country: partnerClients.country,
              status: partnerClients.status,
              renewalDate: partnerClients.renewalDate,
              notes: partnerClients.notes,
              createdAt: partnerClients.createdAt,
              updatedAt: partnerClients.updatedAt,
            })
            .from(partnerClients)
            .where(and(eq(partnerClients.partnerId, partner.id), isNull(partnerClients.deletedAt)))
            .orderBy(desc(partnerClients.createdAt)),
          db
            .select({
              customerName: leads.customerName,
              customerEmail: leads.customerEmail,
              customerCompany: leads.customerCompany,
              status: leads.status,
              createdAt: leads.createdAt,
            })
            .from(leads)
            .where(and(eq(leads.partnerId, partner.id), isNull(leads.deletedAt)))
            .orderBy(desc(leads.createdAt)),
          db
            .select({
              customerCompany: serviceRequests.customerCompany,
              customerContact: serviceRequests.customerContact,
              customerEmail: serviceRequests.customerEmail,
              serviceName: services.name,
              status: serviceRequests.status,
              createdAt: serviceRequests.createdAt,
            })
            .from(serviceRequests)
            .innerJoin(services, eq(serviceRequests.serviceId, services.id))
            .where(and(eq(serviceRequests.partnerId, partner.id), isNull(serviceRequests.deletedAt)))
            .orderBy(desc(serviceRequests.createdAt)),
        ])

        clients = buildClientRecords(savedClientRows, leadRows, requestRows)
      }
    }
  } catch (error) {
    if (isDatabaseConnectivityError(error)) {
      console.error("Partner clients database query failed", error)
      return (
        <DatabaseFallbackCard
          title="Client list is unavailable"
          message="The page loaded, but the client queries timed out or could not reach Postgres. Check local database load, confirm `DATABASE_URL` is valid, and retry once the database is responsive."
          host={getDatabaseErrorHost(error)}
        />
      )
    }

    throw error
  }

  const trackedClients = clients.filter((client) => client.source === "saved").length
  const renewalAttentionCount = clients.filter(
    (client) => client.source === "saved" && ["overdue", "due_soon"].includes(client.renewalState)
  ).length
  const activityOnlyCount = clients.filter((client) => client.source === "activity_only").length

  const scopeValue = normalizeSearchParam(scope)
  const activeScope =
    scopeValue === "saved" || scopeValue === "activity_only" ? scopeValue : "all"
  const query = normalizeSearchParam(q)?.trim() ?? ""

  const filteredClients = clients.filter((client) => {
    if (activeScope !== "all" && client.source !== activeScope) {
      return false
    }

    return clientMatchesQuery(client, query)
  })

  const requestedPage = Number.parseInt(normalizeSearchParam(page) ?? "1", 10)
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / CLIENTS_PER_PAGE))
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, totalPages)
      : 1
  const pageStart = (currentPage - 1) * CLIENTS_PER_PAGE
  const pageClients = filteredClients.slice(pageStart, pageStart + CLIENTS_PER_PAGE)
  const rangeStart = filteredClients.length === 0 ? 0 : pageStart + 1
  const rangeEnd = Math.min(pageStart + CLIENTS_PER_PAGE, filteredClients.length)
  const scopeCounts = {
    all: clients.length,
    saved: trackedClients,
    activity_only: activityOnlyCount,
  }

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-[2rem] px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">Relationship management</div>
            <h1 className="page-title mt-5">Clients</h1>
            <p className="page-subtitle mt-3 max-w-2xl">
              Save your own client book first, then overlay live lead and delivery activity on top of it without losing control once the list gets large.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link href="/dashboard/clients/new" className="primary-button w-full justify-center sm:w-auto">
              <Plus className="h-4 w-4" />
              Add client
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="metric-card">
            <p className="metric-value">{trackedClients}</p>
            <p className="mt-2 text-sm font-semibold text-white">Tracked clients</p>
            <p className="mt-1 text-sm text-slate-400">
              First-class client records owned by your partner workspace.
            </p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{renewalAttentionCount}</p>
            <p className="mt-2 text-sm font-semibold text-white">Renewal attention</p>
            <p className="mt-1 text-sm text-slate-400">
              Clients with overdue or upcoming renewal dates in the next 30 days.
            </p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{activityOnlyCount}</p>
            <p className="mt-2 text-sm font-semibold text-white">Unlinked activity</p>
            <p className="mt-1 text-sm text-slate-400">
              Lead or request activity that has not been saved as a client record yet.
            </p>
          </div>
        </div>
      </section>

      <section className="table-shell">
        <div className="border-b border-white/8 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-heading text-xl font-semibold text-white">Client book</p>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                Search, filter, and page through your saved clients and activity-only records instead of scrolling through oversized cards forever.
              </p>
            </div>
            <span className="tag-pill w-fit">
              <RefreshCw className="h-4 w-4 text-indigo-300" />
              Renewal-aware
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <form className="flex w-full max-w-xl items-center gap-3" action="/dashboard/clients">
              {activeScope !== "all" ? (
                <input type="hidden" name="scope" value={activeScope} />
              ) : null}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search company, contact, email, phone, nationality, trade license"
                  className="field-input h-11 pl-10"
                />
              </div>
              <button type="submit" className="secondary-button h-11 px-4">
                Search
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "All", count: scopeCounts.all },
                { value: "saved", label: "Saved", count: scopeCounts.saved },
                { value: "activity_only", label: "Activity only", count: scopeCounts.activity_only },
              ].map((option) => {
                const isActive = activeScope === option.value
                return (
                  <Link
                    key={option.value}
                    href={buildClientsPageHref({ scope: option.value, query })}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "border border-indigo-400/30 bg-indigo-500/16 text-indigo-100"
                        : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px] text-slate-300">
                      {option.count}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <div className="empty-state m-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/12 text-indigo-200">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-white">
              {clients.length === 0 ? "No clients yet" : "No matching clients"}
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
              {clients.length === 0
                ? "Save your first client to start a partner-owned client book independent of lead and service activity."
                : "Try a different filter or search term to find the client record you need."}
            </p>
            {clients.length === 0 ? (
              <Link href="/dashboard/clients/new" className="primary-button mt-6">
                <Plus className="h-4 w-4" />
                Add first client
              </Link>
            ) : (
              <Link href="/dashboard/clients" className="secondary-button mt-6">
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-slate-500">
                    <th className="px-6 py-4 font-medium">Client</th>
                    <th className="px-6 py-4 font-medium">Snapshot</th>
                    <th className="px-6 py-4 font-medium">Renewal</th>
                    <th className="px-6 py-4 font-medium">Activity</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageClients.map((client) => (
                    <tr
                      key={client.key}
                      className="border-b border-white/6 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{client.displayName}</p>
                          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            {client.source === "saved" ? "Saved" : "Activity only"}
                          </span>
                          {client.status ? (
                            <span
                              className={`status-pill ${clientStatusStyles[client.status] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                            >
                              {formatLabel(client.status)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {client.contactName || "No contact"} · {client.email || client.phone || "No contact details"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {[client.city, client.country, client.nationality].filter(Boolean).join(", ") || "No location"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        <div className="space-y-1.5">
                          <p>
                            <span className="text-slate-500">Trade license:</span>{" "}
                            <span className="text-slate-300">{client.tradeLicenseNumber || "—"}</span>
                          </p>
                          <p>
                            <span className="text-slate-500">Nationality:</span>{" "}
                            <span className="text-slate-300">{client.nationality || "—"}</span>
                          </p>
                          <p>
                            <span className="text-slate-500">Last activity:</span>{" "}
                            <span className="text-slate-300">{formatDate(client.lastActivity)}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`status-pill ${renewalStyles[client.renewalState]}`}>
                          {formatLabel(client.renewalState)}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">
                          {getRenewalLabel(client.renewalDate, client.renewalState)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-3">
                          <div>
                            {client.latestLeadStatus ? (
                              <>
                                <span
                                  className={`status-pill ${leadStatusStyles[client.latestLeadStatus] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                                >
                                  {formatLabel(client.latestLeadStatus)}
                                </span>
                                <p className="mt-2 text-xs text-slate-500">
                                  {client.leadCount} lead{client.leadCount === 1 ? "" : "s"}
                                </p>
                              </>
                            ) : (
                              <span className="text-slate-500">No lead activity</span>
                            )}
                          </div>
                          <div>
                            {client.latestRequestStatus ? (
                              <>
                                <span
                                  className={`status-pill ${requestStatusStyles[client.latestRequestStatus] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                                >
                                  {formatLabel(client.latestRequestStatus)}
                                </span>
                                <p className="mt-2 text-xs text-slate-500">
                                  {client.latestServiceName || "Service request"} · {client.requestCount} request
                                  {client.requestCount === 1 ? "" : "s"}
                                </p>
                              </>
                            ) : (
                              <span className="text-slate-500">No service activity</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={buildClientDetailHref(client)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                            aria-label="View client details"
                            title="View client details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={buildLeadHref(client)}
                            className="tag-pill border-white/10 bg-white/[0.04] text-slate-200"
                          >
                            Create lead
                          </Link>
                          {client.source === "activity_only" ? (
                            <Link
                              href={buildSaveHref(client)}
                              className="tag-pill border-indigo-400/20 bg-indigo-500/10 text-indigo-100"
                            >
                              Save client
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {pageClients.map((client) => (
                <div
                  key={client.key}
                  className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading text-lg font-semibold text-white">
                          {client.displayName}
                        </p>
                        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          {client.source === "saved" ? "Saved" : "Activity only"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {client.contactName || "No contact"} · {client.email || client.phone || "No contact details"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {[client.city, client.country, client.nationality].filter(Boolean).join(", ") || "No location"}
                      </p>
                    </div>
                    {client.status ? (
                      <span
                        className={`status-pill shrink-0 ${clientStatusStyles[client.status] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                      >
                        {formatLabel(client.status)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-[1.1rem] border border-white/8 bg-black/10 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Renewal</p>
                      <p className="mt-2 font-medium text-white">
                        {getRenewalLabel(client.renewalDate, client.renewalState)}
                      </p>
                    </div>
                    <div className="rounded-[1.1rem] border border-white/8 bg-black/10 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Last activity</p>
                      <p className="mt-2 font-medium text-white">{formatDate(client.lastActivity)}</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-white/8 bg-black/10 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Lead activity</p>
                      <p className="mt-2 font-medium text-white">
                        {client.latestLeadStatus
                          ? `${formatLabel(client.latestLeadStatus)} · ${client.leadCount}`
                          : "None"}
                      </p>
                    </div>
                    <div className="rounded-[1.1rem] border border-white/8 bg-black/10 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Service activity</p>
                      <p className="mt-2 font-medium text-white">
                        {client.latestRequestStatus
                          ? `${formatLabel(client.latestRequestStatus)} · ${client.requestCount}`
                          : "None"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 rounded-[1.1rem] border border-white/8 bg-black/10 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Trade license</span>
                      <span className="text-right text-white">{client.tradeLicenseNumber || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Nationality</span>
                      <span className="text-right text-white">{client.nationality || "—"}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      href={buildClientDetailHref(client)}
                      className="secondary-button h-10 flex-1 px-3"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                    <Link
                      href={buildLeadHref(client)}
                      className="primary-button h-10 flex-1 px-3 text-sm"
                    >
                      Create lead
                    </Link>
                  </div>
                  {client.source === "activity_only" ? (
                    <Link
                      href={buildSaveHref(client)}
                      className="secondary-button mt-2 h-10 w-full justify-center px-3 text-sm"
                    >
                      Save client
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 border-t border-white/8 px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-400">
                Showing <span className="text-white">{rangeStart}-{rangeEnd}</span> of{" "}
                <span className="text-white">{filteredClients.length}</span> clients
              </p>
              <div className="flex items-center gap-2">
                <PaginationButton
                  href={buildClientsPageHref({
                    page: currentPage - 1,
                    scope: activeScope,
                    query,
                  })}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </PaginationButton>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <PaginationButton
                  href={buildClientsPageHref({
                    page: currentPage + 1,
                    scope: activeScope,
                    query,
                  })}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </PaginationButton>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
