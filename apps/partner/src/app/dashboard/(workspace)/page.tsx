import { currentUser } from "@repo/auth/server"
import {
  db,
  commissions,
  leads,
  partnerClients,
  partners,
  serviceRequests,
  services,
} from "@repo/db"
import { and, count, desc, eq, isNull, notInArray, sql, sum } from "drizzle-orm"
import Link from "next/link"
import { ArrowRight, CircleDollarSign, ClipboardList, Plus, Users, Wallet } from "lucide-react"
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

export default async function DashboardPage() {
  const user = await currentUser()
  const firstName = user?.firstName || "Partner"
  let partnerRecord: typeof partners.$inferSelect | null = null

  let totalClients = 0
  let unlinkedClientActivity = 0
  let activeRequests = 0
  let totalEarned = 0
  let pendingPayout = 0
  let recentRequests: Array<{
    id: string
    customerCompany: string
    customerContact: string
    serviceName: string
    status: string
    createdAt: Date | null
  }> = []
  let recentClients: ReturnType<typeof buildClientRecords> = []

  try {
    if (user) {
      const [partner] = await db
        .select()
        .from(partners)
        .where(eq(partners.authUserId, user.id))
        .limit(1)

      if (partner) {
        partnerRecord = partner
        const pid = partner.id
        const [savedClientRows, leadRows, requestRows, paidResult, pendingResult, clientCountResult, activeRequestCountResult, unlinkedLeadCountResult] =
          await Promise.all([
            // Recent 5 saved clients (for display)
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
              .where(and(eq(partnerClients.partnerId, pid), isNull(partnerClients.deletedAt)))
              .orderBy(desc(partnerClients.createdAt))
              .limit(10),
            // Recent leads (for activity-only client detection)
            db
              .select({
                customerName: leads.customerName,
                customerEmail: leads.customerEmail,
                customerCompany: leads.customerCompany,
                status: leads.status,
                createdAt: leads.createdAt,
              })
              .from(leads)
              .where(and(eq(leads.partnerId, pid), isNull(leads.deletedAt)))
              .orderBy(desc(leads.createdAt))
              .limit(10),
            // Recent 5 service requests (for display)
            db
              .select({
                id: serviceRequests.id,
                customerCompany: serviceRequests.customerCompany,
                customerContact: serviceRequests.customerContact,
                customerEmail: serviceRequests.customerEmail,
                serviceName: services.name,
                status: serviceRequests.status,
                createdAt: serviceRequests.createdAt,
              })
              .from(serviceRequests)
              .innerJoin(services, eq(serviceRequests.serviceId, services.id))
              .where(and(eq(serviceRequests.partnerId, pid), isNull(serviceRequests.deletedAt)))
              .orderBy(desc(serviceRequests.createdAt))
              .limit(10),
            // Aggregates — cheap COUNT/SUM queries
            db
              .select({ total: sum(commissions.amount) })
              .from(commissions)
              .where(and(eq(commissions.partnerId, pid), eq(commissions.status, "paid"))),
            db
              .select({ total: sum(commissions.amount) })
              .from(commissions)
              .where(and(eq(commissions.partnerId, pid), notInArray(commissions.status, ["paid", "disputed"]))),
            db
              .select({ value: count() })
              .from(partnerClients)
              .where(and(eq(partnerClients.partnerId, pid), isNull(partnerClients.deletedAt))),
            db
              .select({ value: count() })
              .from(serviceRequests)
              .where(and(
                eq(serviceRequests.partnerId, pid),
                isNull(serviceRequests.deletedAt),
                notInArray(serviceRequests.status, ["completed", "cancelled"]),
              )),
            db
              .select({ value: count() })
              .from(leads)
              .where(and(eq(leads.partnerId, pid), isNull(leads.deletedAt))),
          ])

        activeRequests = Number(activeRequestCountResult[0]?.value ?? 0)
        totalEarned = Number(paidResult[0]?.total ?? 0)
        pendingPayout = Number(pendingResult[0]?.total ?? 0)
        const clientRecords = buildClientRecords(
          savedClientRows,
          leadRows,
          requestRows
        )

        recentRequests = requestRows.slice(0, 5)
        recentClients = clientRecords.slice(0, 5)
        totalClients = Number(clientCountResult[0]?.value ?? 0)
        // Approximate: total leads minus saved clients gives activity-only count
        const totalLeads = Number(unlinkedLeadCountResult[0]?.value ?? 0)
        unlinkedClientActivity = Math.max(0, totalLeads - totalClients)
      }
    }
  } catch (error) {
    if (isDatabaseConnectivityError(error)) {
      console.error("Partner dashboard database query failed", error)
      return (
        <DatabaseFallbackCard
          title="Partner dashboard is unavailable"
          message="The page loaded, but the dashboard queries could not reach Postgres. Fix the database host in `DATABASE_URL`, make sure the target is reachable from this machine, then refresh."
          host={getDatabaseErrorHost(error)}
        />
      )
    }

    throw error
  }

  const kpiCards = [
    {
      label: "Clients",
      value: String(totalClients),
      icon: Users,
      detail:
        totalClients > 0
          ? unlinkedClientActivity > 0
            ? `${unlinkedClientActivity} unlinked ${unlinkedClientActivity === 1 ? "record" : "records"} still need saving`
            : "Client book is fully linked"
          : unlinkedClientActivity > 0
            ? `${unlinkedClientActivity} activity-only ${unlinkedClientActivity === 1 ? "record" : "records"}`
            : "No client activity yet",
      href: "/dashboard/clients",
    },
    {
      label: "Open requests",
      value: String(activeRequests),
      icon: ClipboardList,
      detail:
        activeRequests > 0 ? "Delivery requests in progress" : "No active service requests",
      href: "/dashboard/service-requests",
    },
    {
      label: "Paid earnings",
      value: `AED ${totalEarned.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Wallet,
      detail: "Settled commissions",
      href: "/dashboard/commissions",
    },
    {
      label: "Pending payout",
      value: `AED ${pendingPayout.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: CircleDollarSign,
      detail: pendingPayout > 0 ? "Awaiting settlement" : "Nothing pending right now",
      href: "/dashboard/commissions",
    },
  ]

  const accountNotice =
    partnerRecord?.status === "pending"
      ? "Your partner account is pending approval. Lead and service-request submission will unlock once approved."
      : partnerRecord?.status === "rejected"
        ? `Your partner account was rejected${partnerRecord.rejectionReason ? `: ${partnerRecord.rejectionReason}` : "."}`
        : !partnerRecord
          ? "Your partner record is not available yet."
          : !partnerRecord.bankName || !partnerRecord.accountNoIban
            ? "Payout details are incomplete. Commissions can still accrue, but settlement will need bank details on file."
            : null

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">Welcome back, {firstName}.</h1>
          <p className="page-subtitle mt-3 max-w-2xl">
            Start new work quickly and keep an eye on live pipeline activity and payout progress.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link href="/dashboard/leads/new" className="primary-button w-full justify-center sm:w-auto">
            <Plus className="h-4 w-4" />
            New lead
          </Link>
          <Link href="/dashboard/service-requests/new" className="secondary-button w-full justify-center sm:w-auto">
            <ClipboardList className="h-4 w-4" />
            New request
          </Link>
          <Link href="/dashboard/commissions" className="secondary-button w-full justify-center sm:w-auto">
            <CircleDollarSign className="h-4 w-4" />
            Commissions
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <Link key={card.label} href={card.href} className="metric-card group">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-200">
                <card.icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-indigo-300" />
            </div>
            <p className="metric-value mt-6">{card.value}</p>
            <p className="mt-2 text-sm font-semibold text-white">{card.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">{card.detail}</p>
          </Link>
        ))}
      </section>

      {accountNotice ? (
        <section className="surface-card rounded-[1.5rem] border border-indigo-400/16 bg-indigo-500/8 px-4 py-4 sm:rounded-[1.75rem] sm:px-5">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Account notice</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">{accountNotice}</p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="table-shell">
          <div className="flex flex-col gap-3 border-b border-white/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-xl font-semibold text-white">Recent clients</p>
              <p className="mt-1 text-sm text-slate-400">
                Latest client activity across leads and service requests.
              </p>
            </div>
            <Link href="/dashboard/clients" className="tag-pill">
              View all
            </Link>
          </div>

          {recentClients.length === 0 ? (
            <div className="empty-state m-4">
              <p className="font-heading text-2xl font-semibold text-white">No clients yet</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
                Submit your first lead or service request to start the client view.
              </p>
              <Link href="/dashboard/leads/new" className="primary-button mt-6">
                <Plus className="h-4 w-4" />
                Submit lead
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/6">
              {recentClients.map((client) => (
                <div key={client.key} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{client.displayName}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {client.email || client.contactName || "No contact email"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
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

                  {client.latestServiceName ? (
                    <p className="mt-3 text-sm text-slate-400">{client.latestServiceName}</p>
                  ) : null}

                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {formatDate(client.lastActivity)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="table-shell">
          <div className="flex flex-col gap-3 border-b border-white/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-xl font-semibold text-white">Recent service requests</p>
              <p className="mt-1 text-sm text-slate-400">
                Latest delivery requests sent to Finanshels.
              </p>
            </div>
            <Link href="/dashboard/service-requests" className="tag-pill">
              View all
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <div className="empty-state m-4">
              <p className="font-heading text-2xl font-semibold text-white">
                No service requests yet
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
                Create a request when a client is ready to move into delivery.
              </p>
              <Link href="/dashboard/service-requests/new" className="primary-button mt-6">
                <ClipboardList className="h-4 w-4" />
                New request
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/6">
              {recentRequests.map((request) => (
                <div key={request.id} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{request.customerCompany}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {request.serviceName} · {request.customerContact}
                      </p>
                    </div>
                    <span
                      className={`status-pill ${requestStatusStyles[request.status] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                    >
                      {formatLabel(request.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {formatDate(request.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
