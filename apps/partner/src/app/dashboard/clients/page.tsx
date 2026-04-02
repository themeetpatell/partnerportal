import { currentUser } from "@repo/auth/server"
import { db, leads, partners, serviceRequests, services } from "@repo/db"
import { and, desc, eq, isNull } from "drizzle-orm"
import Link from "next/link"
import { ClipboardList, Plus, Users } from "lucide-react"
import { buildClientRecords } from "@/lib/client-records"

const leadStatusStyles: Record<string, string> = {
  submitted: "border border-zinc-300/20 bg-zinc-300/10 text-zinc-100",
  in_review: "border border-zinc-400/20 bg-zinc-400/10 text-zinc-100",
  qualified: "border border-zinc-500/20 bg-zinc-500/10 text-zinc-100",
  proposal_sent: "border border-zinc-600/20 bg-zinc-600/10 text-zinc-100",
  converted: "border border-white/20 bg-white/10 text-white",
  rejected: "border border-zinc-700/20 bg-zinc-700/10 text-zinc-300",
}

const requestStatusStyles: Record<string, string> = {
  pending: "border border-zinc-300/20 bg-zinc-300/10 text-zinc-100",
  in_progress: "border border-zinc-400/20 bg-zinc-400/10 text-zinc-100",
  completed: "border border-white/20 bg-white/10 text-white",
  cancelled: "border border-zinc-600/20 bg-zinc-500/10 text-zinc-300",
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

export default async function ClientsPage() {
  const user = await currentUser()
  let clients = [] as ReturnType<typeof buildClientRecords>

  if (user) {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.authUserId, user.id))
      .limit(1)

    if (partner) {
      const [leadRows, requestRows] = await Promise.all([
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

      clients = buildClientRecords(leadRows, requestRows)
    }
  }

  const clientsWithOpenLead = clients.filter((client) => client.hasOpenLead).length
  const clientsWithActiveRequest = clients.filter((client) => client.hasActiveRequest).length

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">Client view</div>
            <h1 className="page-title mt-5">Clients</h1>
            <p className="page-subtitle mt-3 max-w-2xl">
              One place to review the clients you introduced or routed into delivery, without splitting the story between leads and requests.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/leads/new" className="primary-button">
              <Plus className="h-4 w-4" />
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
            <p className="metric-value">{clients.length}</p>
            <p className="mt-2 text-sm font-semibold text-white">Total clients</p>
            <p className="mt-1 text-sm text-slate-400">
              Combined view across referrals and delivery work.
            </p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{clientsWithOpenLead}</p>
            <p className="mt-2 text-sm font-semibold text-white">Lead pipeline</p>
            <p className="mt-1 text-sm text-slate-400">
              Clients with open lead activity still in motion.
            </p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{clientsWithActiveRequest}</p>
            <p className="mt-2 text-sm font-semibold text-white">Active delivery</p>
            <p className="mt-1 text-sm text-slate-400">
              Clients currently tied to open service requests.
            </p>
          </div>
        </div>
      </section>

      <section className="table-shell">
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
          <div>
            <p className="font-heading text-xl font-semibold text-white">Client list</p>
            <p className="mt-1 text-sm text-slate-400">
              Relationship view across submitted leads and service requests.
            </p>
          </div>
          <span className="tag-pill">
            <Users className="h-4 w-4 text-indigo-300" />
            Unified view
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
              Submit a lead or create a service request to start building the client view.
            </p>
            <Link href="/dashboard/leads/new" className="primary-button mt-6">
              <Plus className="h-4 w-4" />
              Submit first lead
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-slate-500">
                    <th className="px-6 py-4 font-medium">Client</th>
                    <th className="px-6 py-4 font-medium">Lead activity</th>
                    <th className="px-6 py-4 font-medium">Service activity</th>
                    <th className="px-6 py-4 font-medium">Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.key}
                      className="border-b border-white/6 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{client.displayName}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {client.email || client.contactName || "No contact email"}
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
                              {client.latestServiceName || "Service request"} · {client.requestCount} request
                              {client.requestCount === 1 ? "" : "s"}
                            </p>
                          </>
                        ) : (
                          <span className="text-slate-500">No service activity</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {formatDate(client.lastActivity)}
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
                  <p className="font-heading text-lg font-semibold text-white">
                    {client.displayName}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {client.email || client.contactName || "No contact email"}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {client.latestLeadStatus ? (
                      <span
                        className={`status-pill ${leadStatusStyles[client.latestLeadStatus] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                      >
                        Lead · {formatLabel(client.latestLeadStatus)}
                      </span>
                    ) : null}
                    {client.latestRequestStatus ? (
                      <span
                        className={`status-pill ${requestStatusStyles[client.latestRequestStatus] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                      >
                        Request · {formatLabel(client.latestRequestStatus)}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {formatDate(client.lastActivity)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
