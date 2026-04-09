import Link from "next/link"
import { db, partners, leads, commissions } from "@repo/db"
import { desc, eq, sql, sum } from "drizzle-orm"
import {
  UserCheck,
  Clock,
  Users,
  AlertCircle,
  DollarSign,
  ArrowRight,
  Building2,
} from "lucide-react"
import { DatabaseFallbackCard } from "@/components/database-fallback-card"
import { getDatabaseErrorHost, isDatabaseConnectivityError } from "@/lib/database-error"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    approved: "bg-green-950/60 border-green-800/40 text-green-400",
    rejected: "bg-red-950/60 border-red-800/40 text-red-400",
    suspended: "bg-white/6 border-white/10 text-slate-400",
    submitted: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    qualified: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
    proposal_sent: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    deal_won: "bg-green-950/60 border-green-800/40 text-green-400",
    deal_lost: "bg-red-950/60 border-red-800/40 text-red-400",
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[status] ?? "bg-white/6 border-white/10 text-slate-400"}`}
    >
      {status.replace("_", " ")}
    </span>
  )
}

export default async function AdminOverviewPage() {
  let dashboardData

  try {
    dashboardData = await db.transaction(async (tx) => {
      // Keep the overview fetch on a single pooled connection so the landing page
      // does not fan out into multiple concurrent queries under serverless load.
      const partnerMetricsResult = await tx
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`count(*) filter (where ${partners.status} = 'pending')`,
        })
        .from(partners)

      const leadMetricsResult = await tx
        .select({
          total: sql<number>`count(*)`,
          submitted: sql<number>`count(*) filter (where ${leads.status} = 'submitted')`,
        })
        .from(leads)

      const pendingCommissionsResult = await tx
        .select({ total: sum(commissions.amount) })
        .from(commissions)
        .where(eq(commissions.status, "pending"))

      const pendingPartnersList = await tx
        .select({
          id: partners.id,
          companyName: partners.companyName,
          contactName: partners.contactName,
          type: partners.type,
          createdAt: partners.createdAt,
        })
        .from(partners)
        .where(eq(partners.status, "pending"))
        .orderBy(desc(partners.createdAt))
        .limit(5)

      const recentLeadsList = await tx
        .select({
          id: leads.id,
          customerName: leads.customerName,
          customerCompany: leads.customerCompany,
          serviceInterest: leads.serviceInterest,
          status: leads.status,
          createdAt: leads.createdAt,
        })
        .from(leads)
        .orderBy(desc(leads.createdAt))
        .limit(5)

      return [
        partnerMetricsResult,
        leadMetricsResult,
        pendingCommissionsResult,
        pendingPartnersList,
        recentLeadsList,
      ] as const
    })
  } catch (error) {
    if (isDatabaseConnectivityError(error)) {
      console.error("Admin overview database query failed", error)
      return (
        <DatabaseFallbackCard
          title="Admin overview is unavailable"
          message="The page loaded, but the overview queries could not reach Postgres. Fix the database host in `DATABASE_URL`, make sure the target is reachable from this machine, then refresh."
          host={getDatabaseErrorHost(error)}
        />
      )
    }

    throw error
  }

  const [
    partnerMetricsResult,
    leadMetricsResult,
    pendingCommissionsResult,
    pendingPartnersList,
    recentLeadsList,
  ] = dashboardData

  const totalPartners = Number(partnerMetricsResult[0]?.total ?? 0)
  const pendingPartners = Number(partnerMetricsResult[0]?.pending ?? 0)
  const totalLeads = Number(leadMetricsResult[0]?.total ?? 0)
  const submittedLeads = Number(leadMetricsResult[0]?.submitted ?? 0)
  const pendingCommissionsTotal = Number(
    pendingCommissionsResult[0]?.total ?? 0
  ).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const kpiCards = [
    {
      label: "Total Partners",
      value: String(totalPartners),
      icon: UserCheck,
      description: "All registered partners",
      color: "text-indigo-400",
      bg: "bg-indigo-950/40 border-indigo-800/30",
    },
    {
      label: "Pending Approvals",
      value: String(pendingPartners),
      icon: Clock,
      description: "Partners awaiting review",
      color: "text-yellow-400",
      bg: "bg-yellow-950/40 border-yellow-800/30",
    },
    {
      label: "Total Leads",
      value: String(totalLeads),
      icon: Users,
      description: "Leads submitted",
      color: "text-blue-400",
      bg: "bg-blue-950/40 border-blue-800/30",
    },
    {
      label: "Leads Needing Review",
      value: String(submittedLeads),
      icon: AlertCircle,
      description: "Submitted, not yet reviewed",
      color: "text-orange-400",
      bg: "bg-orange-950/40 border-orange-800/30",
    },
    {
      label: "Commissions Pending",
      value: `AED ${pendingCommissionsTotal}`,
      icon: DollarSign,
      description: "Awaiting approval",
      color: "text-green-400",
      bg: "bg-green-950/40 border-green-800/30",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
        <p className="text-slate-400 text-sm mt-1">
          Monitor partner activity, leads, and commissions across the platform
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="surface-card rounded-2xl p-5 transition-colors hover:border-white/20"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-10 h-10 rounded-lg border flex items-center justify-center ${card.bg}`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-slate-400 text-sm font-medium mt-0.5">
                {card.label}
              </p>
              <p className="text-slate-500 text-xs mt-1">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Approvals + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Partner Approvals */}
        <div className="surface-card rounded-2xl">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              Pending Partner Approvals
            </h2>
            <Link
              href="/partners?status=pending"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/8">
            {pendingPartnersList.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-slate-500 text-sm">No pending approvals</p>
              </div>
            ) : (
              pendingPartnersList.map((partner) => (
                <div
                  key={partner.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {partner.companyName}
                      </p>
                      <p className="text-slate-500 text-xs truncate">
                        {partner.contactName} &middot;{" "}
                        <span className="capitalize">{partner.type}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-slate-600 text-xs hidden sm:block">
                      {new Date(partner.createdAt).toLocaleDateString("en-AE", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <Link
                      href={`/partners/${partner.id}`}
                      className="text-xs bg-indigo-400 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="surface-card rounded-2xl">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Recent Leads
            </h2>
            <Link
              href="/leads"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/8">
            {recentLeadsList.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-slate-500 text-sm">No leads yet</p>
              </div>
            ) : (
              recentLeadsList.map((lead) => {
                const services = (() => {
                  try {
                    return (JSON.parse(lead.serviceInterest) as string[]).join(
                      ", "
                    )
                  } catch {
                    return lead.serviceInterest
                  }
                })()
                return (
                  <div
                    key={lead.id}
                    className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {lead.customerName}
                      </p>
                      <p className="text-slate-500 text-xs truncate">
                        {lead.customerCompany
                          ? `${lead.customerCompany} · `
                          : ""}
                        {services}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={lead.status} />
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
