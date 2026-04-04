import { currentUser } from "@repo/auth/server"
import { db, leads, partners } from "@repo/db"
import { and, desc, eq, isNull } from "drizzle-orm"
import Link from "next/link"
import { Plus, Users } from "lucide-react"
import { DatabaseFallbackCard } from "@/components/database-fallback-card"
import { getDatabaseErrorHost, isDatabaseConnectivityError } from "@/lib/database-error"

const statusStyles: Record<string, string> = {
  submitted: "border border-zinc-300/20 bg-zinc-300/10 text-zinc-100",
  qualified: "border border-sky-400/20 bg-sky-500/10 text-sky-100",
  proposal_sent: "border border-indigo-400/20 bg-indigo-500/10 text-indigo-100",
  deal_won: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  deal_lost: "border border-zinc-700/20 bg-zinc-700/10 text-zinc-400",
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

export default async function LeadsPage() {
  const user = await currentUser()

  type LeadRow = typeof leads.$inferSelect
  let rows: LeadRow[] = []

  try {
    if (user) {
      const [partner] = await db
        .select()
        .from(partners)
        .where(eq(partners.authUserId, user.id))
        .limit(1)

      if (partner) {
        rows = await db
          .select()
          .from(leads)
          .where(and(eq(leads.partnerId, partner.id), isNull(leads.deletedAt)))
          .orderBy(desc(leads.createdAt))
      }
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

  const openCount = rows.filter(
    (r) => !["deal_won", "deal_lost"].includes(r.status)
  ).length
  const wonCount = rows.filter((r) => r.status === "deal_won").length

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-[2rem] px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">Leads to Finanshels</div>
            <h1 className="page-title mt-5">Leads</h1>
            <p className="page-subtitle mt-3 max-w-2xl">
              All leads you have submitted to Finanshels. Track their progress from submission to deal won.
            </p>
          </div>
          <Link href="/dashboard/leads/new" className="primary-button w-full justify-center sm:w-auto">
            <Plus className="h-4 w-4" />
            Submit lead
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="metric-card">
            <p className="metric-value">{rows.length}</p>
            <p className="mt-2 text-sm font-semibold text-white">Total leads</p>
            <p className="mt-1 text-sm text-slate-400">All leads submitted to Finanshels.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{openCount}</p>
            <p className="mt-2 text-sm font-semibold text-white">In pipeline</p>
            <p className="mt-1 text-sm text-slate-400">Leads actively being worked on.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{wonCount}</p>
            <p className="mt-2 text-sm font-semibold text-white">Deals won</p>
            <p className="mt-1 text-sm text-slate-400">Leads that converted to closed deals.</p>
          </div>
        </div>
      </section>

      <section className="table-shell">
        <div className="flex flex-col gap-3 border-b border-white/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-heading text-xl font-semibold text-white">All leads</p>
            <p className="mt-1 text-sm text-slate-400">
              Sorted by most recently submitted.
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state m-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/12 text-indigo-200">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-white">No leads yet</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
              Submit your first lead to Finanshels and track it here.
            </p>
            <Link href="/dashboard/leads/new" className="primary-button mt-6">
              <Plus className="h-4 w-4" />
              Submit first lead
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-slate-500">
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Services</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">CRM</th>
                    <th className="px-6 py-4 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((lead) => {
                    const services = parseServices(lead.serviceInterest)
                    return (
                      <tr
                        key={lead.id}
                        className="border-b border-white/6 transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-6 py-4">
                          <Link href={`/dashboard/leads/${lead.id}`} className="group">
                            <p className="font-medium text-white group-hover:text-indigo-200">{lead.customerName}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {lead.customerCompany
                                ? `${lead.customerCompany} · `
                                : ""}
                              {lead.customerEmail}
                            </p>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          {services.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {services.slice(0, 2).map((s) => (
                                <span
                                  key={s}
                                  className="status-pill border border-white/10 bg-white/[0.05] text-slate-300"
                                >
                                  {s}
                                </span>
                              ))}
                              {services.length > 2 ? (
                                <span className="status-pill border border-white/10 bg-white/[0.05] text-slate-400">
                                  +{services.length - 2}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`status-pill ${statusStyles[lead.status] ?? "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                          >
                            {formatLabel(lead.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {lead.zohoLeadId ? (
                            <span className="status-pill border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                              In CRM
                            </span>
                          ) : (
                            <span className="status-pill border border-amber-400/20 bg-amber-400/10 text-amber-300">
                              Not synced
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {formatDate(lead.createdAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid gap-4 p-4 md:hidden">
              {rows.map((lead) => {
                const services = parseServices(lead.serviceInterest)
                return (
                  <Link
                    key={lead.id}
                    href={`/dashboard/leads/${lead.id}`}
                    className="block rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-heading text-lg font-semibold text-white">
                          {lead.customerName}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {lead.customerCompany || lead.customerEmail}
                        </p>
                      </div>
                      <span
                        className={`status-pill shrink-0 ${statusStyles[lead.status] ?? "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                      >
                        {formatLabel(lead.status)}
                      </span>
                    </div>
                    {services.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {services.map((s) => (
                          <span
                            key={s}
                            className="status-pill border border-white/10 bg-white/[0.05] text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Submitted {formatDate(lead.createdAt)}
                      </p>
                      {lead.zohoLeadId ? (
                        <span className="status-pill border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                          In CRM
                        </span>
                      ) : (
                        <span className="status-pill border border-amber-400/20 bg-amber-400/10 text-amber-300">
                          Not synced
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
