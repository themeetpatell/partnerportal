import { currentUser } from "@repo/auth/server"
import { db, commissions, leads, partnerClients } from "@repo/db"
import { and, count, desc, eq, isNull, notInArray, sum } from "drizzle-orm"
import Link from "next/link"
import { ArrowRight, CircleDollarSign, ClipboardList, Plus, Users, Wallet } from "lucide-react"
import { buildClientRecords } from "@/lib/client-records"
import { DatabaseFallbackCard } from "@/components/database-fallback-card"
import { getDatabaseErrorHost, isDatabaseConnectivityError } from "@/lib/database-error"
import { getCurrentPartnerRecord } from "@/lib/partner-record"

const leadStatusStyles: Record<string, string> = {
  submitted: "border border-border bg-secondary text-foreground/90",
  lead_approved: "border border-sky-500/25 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:text-sky-100",
  lead_follow_up: "border border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:border-cyan-400/20 dark:text-cyan-100",
  lead_qualified: "border border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400/20 dark:text-indigo-100",
  proposal_sent: "border border-primary/20 bg-primary/10 text-primary",
  deal_won: "border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-100",
  deal_lost: "border border-border bg-secondary/60 text-[var(--portal-text-soft)]",
}

function parseServices(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string" && s.trim().length > 0) : []
  } catch {
    return []
  }
}

function IntakeBadge({ intakeType }: { intakeType: string | null | undefined }) {
  const isExisting = intakeType === "existing_lead"
  return (
    <span
      className={`status-pill shrink-0 ${
        isExisting
          ? "border border-violet-500/25 bg-violet-500/10 text-violet-700 dark:border-violet-400/25 dark:text-violet-100"
          : "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"
      }`}
    >
      {isExisting ? "Existing lead" : "New lead"}
    </span>
  )
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
  const [user, partnerRecord] = await Promise.all([
    currentUser(),
    getCurrentPartnerRecord(),
  ])
  const firstName = user?.firstName || "Partner"

  let totalClients = 0
  let unlinkedClientActivity = 0
  let openPipelineLeads = 0
  let totalEarned = 0
  let pendingPayout = 0
  let recentLeads: Array<{
    id: string
    intakeType: string | null
    customerCompany: string | null
    customerName: string
    customerEmail: string
    serviceInterest: string | null
    status: string
    createdAt: Date | null
  }> = []
  let recentClients: ReturnType<typeof buildClientRecords> = []

  try {
    if (partnerRecord) {
      const pid = partnerRecord.id
      const [savedClientRows, leadRows, paidResult, pendingResult, clientCountResult, openPipelineCountResult, unlinkedLeadCountResult, recentLeadRows] =
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
              .from(leads)
              .where(
                and(
                  eq(leads.partnerId, pid),
                  isNull(leads.deletedAt),
                  notInArray(leads.status, ["deal_won", "deal_lost"]),
                ),
              ),
            db
              .select({ value: count() })
              .from(leads)
              .where(and(eq(leads.partnerId, pid), isNull(leads.deletedAt))),
            db
              .select({
                id: leads.id,
                intakeType: leads.intakeType,
                customerCompany: leads.customerCompany,
                customerName: leads.customerName,
                customerEmail: leads.customerEmail,
                serviceInterest: leads.serviceInterest,
                status: leads.status,
                createdAt: leads.createdAt,
              })
              .from(leads)
              .where(and(eq(leads.partnerId, pid), isNull(leads.deletedAt)))
              .orderBy(desc(leads.createdAt))
              .limit(5),
          ])

      openPipelineLeads = Number(openPipelineCountResult[0]?.value ?? 0)
      totalEarned = Number(paidResult[0]?.total ?? 0)
      pendingPayout = Number(pendingResult[0]?.total ?? 0)
      const clientRecords = buildClientRecords(savedClientRows, leadRows, [])

      recentLeads = recentLeadRows
      recentClients = clientRecords.slice(0, 5)
      totalClients = Number(clientCountResult[0]?.value ?? 0)
      const totalLeads = Number(unlinkedLeadCountResult[0]?.value ?? 0)
      unlinkedClientActivity = Math.max(0, totalLeads - totalClients)
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
      label: "Open pipeline",
      value: String(openPipelineLeads),
      icon: ClipboardList,
      detail:
        openPipelineLeads > 0 ? "Leads not yet won or lost" : "Pipeline is clear right now",
      href: "/dashboard/leads",
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
      ? "Your partner account is pending approval. Lead submission will unlock once approved."
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
          <Link
            href="/dashboard/leads/new?leadType=existing"
            className="secondary-button w-full justify-center sm:w-auto"
          >
            <ClipboardList className="h-4 w-4" />
            Existing client referral
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/60 transition-colors group-hover:text-primary" />
            </div>
            <p className="metric-value mt-6">{card.value}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{card.label}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{card.detail}</p>
          </Link>
        ))}
      </section>

      {accountNotice ? (
        <section className="surface-card rounded-[1.5rem] border border-indigo-400/16 bg-indigo-500/8 px-4 py-4 sm:rounded-[1.75rem] sm:px-5">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Account notice</p>
          <p className="mt-2 text-sm leading-6 text-foreground/90">{accountNotice}</p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="table-shell">
          <div className="flex flex-col gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-xl font-semibold text-foreground">Recent clients</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest client activity from your lead pipeline.
              </p>
            </div>
            <Link href="/dashboard/clients" className="tag-pill">
              View all
            </Link>
          </div>

          {recentClients.length === 0 ? (
            <div className="empty-state m-4">
              <p className="font-heading text-2xl font-semibold text-foreground">No clients yet</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                Submit your first lead to start the client view.
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
                      <p className="font-medium text-foreground">{client.displayName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {client.email || client.contactName || "No contact email"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {client.latestLeadStatus ? (
                      <span
                        className={`status-pill ${leadStatusStyles[client.latestLeadStatus] || "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
                      >
                        Lead · {formatLabel(client.latestLeadStatus)}
                      </span>
                    ) : null}
                  </div>

                  {client.latestServiceName ? (
                    <p className="mt-3 text-sm text-muted-foreground">{client.latestServiceName}</p>
                  ) : null}

                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {formatDate(client.lastActivity)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="table-shell">
          <div className="flex flex-col gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-xl font-semibold text-foreground">Recent leads</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New introductions and existing-client referrals in one place.
              </p>
            </div>
            <Link href="/dashboard/leads" className="tag-pill">
              View all
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div className="empty-state m-4">
              <p className="font-heading text-2xl font-semibold text-foreground">No leads yet</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                Send Finanshels a new introduction or a follow-on from a client you already closed.
              </p>
              <Link href="/dashboard/leads/new" className="primary-button mt-6">
                <Plus className="h-4 w-4" />
                Submit a lead
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/6">
              {recentLeads.map((lead) => {
                const services = parseServices(lead.serviceInterest)
                const servicesLine = services.length > 0 ? services.join(", ") : "—"
                return (
                  <Link key={lead.id} href={`/dashboard/leads/${lead.id}`} className="block px-6 py-5 transition-colors hover:bg-secondary/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {lead.customerCompany?.trim() || lead.customerName}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {servicesLine} · {lead.customerName}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <IntakeBadge intakeType={lead.intakeType} />
                        <span
                          className={`status-pill ${leadStatusStyles[lead.status] || "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
                        >
                          {formatLabel(lead.status)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {formatDate(lead.createdAt)}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
