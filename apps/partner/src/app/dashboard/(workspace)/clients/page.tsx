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
import { ClipboardList, Plus, RefreshCw, Users } from "lucide-react"
import { buildClientRecords } from "@/lib/client-records"
import { DatabaseFallbackCard } from "@/components/database-fallback-card"
import { getDatabaseErrorHost, isDatabaseConnectivityError } from "@/lib/database-error"

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

export default async function ClientsPage() {
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
              city: partnerClients.city,
              country: partnerClients.country,
              status: partnerClients.status,
              renewalDate: partnerClients.renewalDate,
              notes: partnerClients.notes,
              createdAt: partnerClients.createdAt,
              updatedAt: partnerClients.updatedAt,
            })
            .from(partnerClients)
            .where(
              and(
                eq(partnerClients.partnerId, partner.id),
                isNull(partnerClients.deletedAt)
              )
            )
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
            .where(
              and(
                eq(serviceRequests.partnerId, partner.id),
                isNull(serviceRequests.deletedAt)
              )
            )
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
    (client) =>
      client.source === "saved" &&
      ["overdue", "due_soon"].includes(client.renewalState)
  ).length
  const activityOnlyCount = clients.filter(
    (client) => client.source === "activity_only"
  ).length

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">Relationship management</div>
            <h1 className="page-title mt-5">Clients</h1>
            <p className="page-subtitle mt-3 max-w-2xl">
              Save your own client book first, then overlay live Finanshels lead and delivery activity on top of it.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/clients/new" className="primary-button">
              <Plus className="h-4 w-4" />
              Add client
            </Link>
            <Link href="/dashboard/leads/new" className="secondary-button">
              <Users className="h-4 w-4" />
              Submit lead
            </Link>
            <Link href="/dashboard/service-requests/new" className="secondary-button">
              <ClipboardList className="h-4 w-4" />
              New request
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
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
          <div>
            <p className="font-heading text-xl font-semibold text-white">Client book</p>
            <p className="mt-1 text-sm text-slate-400">
              Saved clients come first. Activity-only records stay visible until you save them properly.
            </p>
          </div>
          <span className="tag-pill">
            <RefreshCw className="h-4 w-4 text-indigo-300" />
            Renewal-aware
          </span>
        </div>

        {clients.length === 0 ? (
          <div className="empty-state m-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/12 text-indigo-200">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-white">
              No clients yet
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
              Save your first client to start a partner-owned client book independent of lead and service activity.
            </p>
            <Link href="/dashboard/clients/new" className="primary-button mt-6">
              <Plus className="h-4 w-4" />
              Add first client
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-slate-500">
                    <th className="px-6 py-4 font-medium">Client</th>
                    <th className="px-6 py-4 font-medium">Renewal</th>
                    <th className="px-6 py-4 font-medium">Lead activity</th>
                    <th className="px-6 py-4 font-medium">Service activity</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
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
                          {client.contactName || "No contact"} ·{" "}
                          {client.email || client.phone || "No contact details"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`status-pill ${renewalStyles[client.renewalState]}`}
                        >
                          {formatLabel(client.renewalState)}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">
                          {getRenewalLabel(client.renewalDate, client.renewalState)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
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
                      </td>
                      <td className="px-6 py-4">
                        {client.latestRequestStatus ? (
                          <>
                            <span
                              className={`status-pill ${requestStatusStyles[client.latestRequestStatus] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                            >
                              {formatLabel(client.latestRequestStatus)}
                            </span>
                            <p className="mt-2 text-xs text-slate-500">
                              {client.latestServiceName || "Service request"} ·{" "}
                              {client.requestCount} request
                              {client.requestCount === 1 ? "" : "s"}
                            </p>
                          </>
                        ) : (
                          <span className="text-slate-500">No service activity</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
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
                          ) : (
                            <span className="text-xs text-slate-500">
                              Last activity {formatDate(client.lastActivity)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 md:hidden">
              {clients.map((client) => (
                <div
                  key={client.key}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-lg font-semibold text-white">
                      {client.displayName}
                    </p>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {client.source === "saved" ? "Saved" : "Activity only"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {client.contactName || "No contact"} ·{" "}
                    {client.email || client.phone || "No contact details"}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {client.status ? (
                      <span
                        className={`status-pill ${clientStatusStyles[client.status] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                      >
                        {formatLabel(client.status)}
                      </span>
                    ) : null}
                    <span
                      className={`status-pill ${renewalStyles[client.renewalState]}`}
                    >
                      {getRenewalLabel(client.renewalDate, client.renewalState)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-[1.15rem] border border-white/8 bg-black/10 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Lead activity</span>
                      <span className="text-white">
                        {client.latestLeadStatus
                          ? `${formatLabel(client.latestLeadStatus)} · ${client.leadCount}`
                          : "None"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Service activity</span>
                      <span className="text-white">
                        {client.latestRequestStatus
                          ? `${formatLabel(client.latestRequestStatus)} · ${client.requestCount}`
                          : "None"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last activity</span>
                      <span className="text-white">{formatDate(client.lastActivity)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={buildLeadHref(client)}
                      className="primary-button h-auto px-4 py-2 text-sm"
                    >
                      Create lead
                    </Link>
                    {client.source === "activity_only" ? (
                      <Link
                        href={buildSaveHref(client)}
                        className="secondary-button h-auto px-4 py-2 text-sm"
                      >
                        Save client
                      </Link>
                    ) : (
                      <span className="self-center text-xs text-slate-500">
                        Last activity {formatDate(client.lastActivity)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
