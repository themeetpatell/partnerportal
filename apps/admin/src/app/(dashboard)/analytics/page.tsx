import Link from "next/link"
import {
  db,
  partners,
  leads,
  commissions,
  invoices,
  serviceRequests,
  teamMembers,
  savedFilters,
} from "@repo/db"
import {
  eq,
  count,
  sum,
  and,
  isNull,
  gte,
  lte,
  sql,
} from "drizzle-orm"
import {
  Users,
  UserCheck,
  TrendingUp,
  DollarSign,
  FileText,
  ClipboardList,
  Download,
} from "lucide-react"
import { auth } from "@clerk/nextjs/server"
import { AnalyticsFilterBar } from "@/components/analytics-filter-bar"

function getDateRange(preset: string | undefined): { from?: Date; to?: Date } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()

  switch (preset) {
    case "today":
      return { from: new Date(y, m, d), to: now }
    case "yesterday":
      return { from: new Date(y, m, d - 1), to: new Date(y, m, d) }
    case "this_week": {
      const dow = now.getDay()
      return { from: new Date(y, m, d - dow), to: now }
    }
    case "last_week": {
      const dow = now.getDay()
      return {
        from: new Date(y, m, d - dow - 7),
        to: new Date(y, m, d - dow),
      }
    }
    case "this_month":
      return { from: new Date(y, m, 1), to: now }
    case "last_month":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) }
    case "this_quarter": {
      const q = Math.floor(m / 3)
      return { from: new Date(y, q * 3, 1), to: now }
    }
    case "last_quarter": {
      const q = Math.floor(m / 3)
      return {
        from: new Date(y, (q - 1) * 3, 1),
        to: new Date(y, q * 3, 1),
      }
    }
    case "this_year":
      return { from: new Date(y, 0, 1), to: now }
    default:
      return {}
  }
}

function buildDateWhere(
  col: Parameters<typeof gte>[0],
  range: { from?: Date; to?: Date }
) {
  if (range.from && range.to) return and(gte(col, range.from), lte(col, range.to))
  if (range.from) return gte(col, range.from)
  if (range.to) return lte(col, range.to)
  return undefined
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  href,
}: {
  label: string
  value: string
  sub: string
  icon: React.ElementType
  color: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-lg border flex items-center justify-center ${color}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-zinc-400 text-sm font-medium mt-0.5">{label}</p>
      <p className="text-zinc-600 text-xs mt-1">{sub}</p>
    </Link>
  )
}

function MiniBarChart({ data }: { data: { label: string; created: number; converted: number }[] }) {
  const max = Math.max(...data.flatMap((d) => [d.created, d.converted]), 1)
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full flex items-end gap-0.5 h-20">
            <div
              className="flex-1 bg-indigo-600/70 rounded-sm min-h-[2px] transition-all"
              style={{ height: `${Math.round((d.created / max) * 80)}px` }}
              title={`Created: ${d.created}`}
            />
            <div
              className="flex-1 bg-green-600/70 rounded-sm min-h-[2px] transition-all"
              style={{ height: `${Math.round((d.converted / max) * 80)}px` }}
              title={`Converted: ${d.converted}`}
            />
          </div>
          <span className="text-zinc-600 text-[9px]">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const { userId } = await auth()
  const sp = await searchParams

  const dateRange = getDateRange(sp.dateRange)
  const partnerId = sp.partnerId
  const teamMemberId = sp.teamMemberId
  const leadStatus = sp.leadStatus
  const serviceStatus = sp.serviceStatus
  const invoiceStatus = sp.invoiceStatus
  const channel = sp.channel
  const region = sp.region
  const currency = sp.currency

  // Conditions
  const leadConditions = [
    isNull(leads.deletedAt),
    buildDateWhere(leads.createdAt, dateRange),
    partnerId ? eq(leads.partnerId, partnerId) : undefined,
    teamMemberId ? eq(leads.assignedTo, teamMemberId) : undefined,
    leadStatus ? eq(leads.status, leadStatus) : undefined,
    channel ? eq(leads.channel, channel) : undefined,
    region ? eq(leads.region, region) : undefined,
  ].filter(Boolean) as Parameters<typeof and>

  const srConditions = [
    isNull(serviceRequests.deletedAt),
    buildDateWhere(serviceRequests.createdAt, dateRange),
    partnerId ? eq(serviceRequests.partnerId, partnerId) : undefined,
    teamMemberId ? eq(serviceRequests.assignedTo, teamMemberId) : undefined,
    serviceStatus ? eq(serviceRequests.status, serviceStatus) : undefined,
  ].filter(Boolean) as Parameters<typeof and>

  const invoiceConditions = [
    isNull(invoices.deletedAt),
    buildDateWhere(invoices.createdAt, dateRange),
    partnerId ? eq(invoices.partnerId, partnerId) : undefined,
    invoiceStatus ? eq(invoices.status, invoiceStatus) : undefined,
    currency ? eq(invoices.currency, currency) : undefined,
  ].filter(Boolean) as Parameters<typeof and>

  const partnerConditions = [
    isNull(partners.deletedAt),
    buildDateWhere(partners.createdAt, dateRange),
    region ? eq(partners.region, region) : undefined,
    channel ? eq(partners.channel, channel) : undefined,
  ].filter(Boolean) as Parameters<typeof and>

  const [
    totalPartnersResult,
    totalLeadsResult,
    convertedLeadsResult,
    pendingCommResult,
    revenueResult,
    totalSRResult,
    completedSRResult,
    partnersList,
    membersList,
    userSavedFilters,
    monthlyLeads,
    teamRows,
  ] = await Promise.all([
    db.select({ count: count() }).from(partners).where(and(...partnerConditions)),
    db.select({ count: count() }).from(leads).where(and(...leadConditions)),
    db
      .select({ count: count() })
      .from(leads)
      .where(and(...leadConditions, eq(leads.status, "converted"))),
    db
      .select({ total: sum(commissions.amount) })
      .from(commissions)
      .where(eq(commissions.status, "pending")),
    db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(and(...invoiceConditions, eq(invoices.status, "paid"))),
    db.select({ count: count() }).from(serviceRequests).where(and(...srConditions)),
    db
      .select({ count: count() })
      .from(serviceRequests)
      .where(and(...srConditions, eq(serviceRequests.status, "completed"))),
    db
      .select({ id: partners.id, companyName: partners.companyName })
      .from(partners)
      .where(isNull(partners.deletedAt))
      .orderBy(partners.companyName),
    db
      .select({
        id: teamMembers.id,
        name: teamMembers.name,
        clerkUserId: teamMembers.clerkUserId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.isActive, true)),
    userId
      ? db
          .select()
          .from(savedFilters)
          .where(
            and(eq(savedFilters.userId, userId), eq(savedFilters.context, "analytics"))
          )
      : Promise.resolve([]),
    // Monthly lead trend — last 6 months
    db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'Mon') AS label,
        DATE_TRUNC('month', created_at) AS month,
        COUNT(*) FILTER (WHERE deleted_at IS NULL) AS created,
        COUNT(*) FILTER (WHERE status = 'converted' AND deleted_at IS NULL) AS converted
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month, label
      ORDER BY month
    `),
    // Team performance — leads assigned
    db.execute(sql`
      SELECT
        tm.name,
        tm.role,
        COUNT(l.id) AS total,
        COUNT(l.id) FILTER (WHERE l.status = 'qualified' OR l.status = 'converted') AS qualified,
        COUNT(l.id) FILTER (WHERE l.status = 'converted') AS converted
      FROM team_members tm
      LEFT JOIN leads l ON l.assigned_to = tm.clerk_user_id AND l.deleted_at IS NULL
      WHERE tm.is_active = true
      GROUP BY tm.id, tm.name, tm.role
      ORDER BY total DESC
      LIMIT 10
    `),
  ])

  const totalPartners = totalPartnersResult[0]?.count ?? 0
  const totalLeads = totalLeadsResult[0]?.count ?? 0
  const convertedLeads = convertedLeadsResult[0]?.count ?? 0
  const conversionRate =
    Number(totalLeads) > 0
      ? ((Number(convertedLeads) / Number(totalLeads)) * 100).toFixed(1)
      : "0.0"
  const pendingComm = Number(pendingCommResult[0]?.total ?? 0).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const revenue = Number(revenueResult[0]?.total ?? 0).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const totalSR = totalSRResult[0]?.count ?? 0
  const completedSR = completedSRResult[0]?.count ?? 0
  const srRate =
    Number(totalSR) > 0
      ? ((Number(completedSR) / Number(totalSR)) * 100).toFixed(1)
      : "0.0"

  const chartData = (monthlyLeads.rows as { label: string; created: string; converted: string }[]).map(
    (r) => ({
      label: r.label,
      created: Number(r.created),
      converted: Number(r.converted),
    })
  )

  const teamData = (
    teamRows.rows as {
      name: string
      role: string
      total: string
      qualified: string
      converted: string
    }[]
  ).map((r) => ({
    name: r.name,
    role: r.role,
    total: Number(r.total),
    qualified: Number(r.qualified),
    converted: Number(r.converted),
  }))

  const currentFilters = {
    dateRange: sp.dateRange,
    partnerId: sp.partnerId,
    teamMemberId: sp.teamMemberId,
    leadStatus: sp.leadStatus,
    leadSource: sp.leadSource,
    serviceStatus: sp.serviceStatus,
    invoiceStatus: sp.invoiceStatus,
    region: sp.region,
    channel: sp.channel,
    currency: sp.currency,
  }

  const filterLabel =
    sp.dateRange
      ? {
          today: "Today",
          yesterday: "Yesterday",
          this_week: "This Week",
          last_week: "Last Week",
          this_month: "This Month",
          last_month: "Last Month",
          this_quarter: "This Quarter",
          last_quarter: "Last Quarter",
          this_year: "This Year",
        }[sp.dateRange] ?? sp.dateRange
      : "All Time"

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Analytics — {filterLabel}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Platform-wide performance overview
          </p>
        </div>
        <a
          href={`/api/admin/analytics/export?${new URLSearchParams(
            Object.entries(currentFilters).filter(([, v]) => Boolean(v)) as [string, string][]
          )}`}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </a>
      </div>

      {/* Filter bar */}
      <AnalyticsFilterBar
        partners={partnersList}
        teamMembers={membersList}
        currentFilters={currentFilters}
        savedFilters={userSavedFilters}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Total Partners"
          value={String(totalPartners)}
          sub="Registered accounts"
          icon={UserCheck}
          color="bg-indigo-950/40 border-indigo-800/30 text-indigo-400"
          href="/partners"
        />
        <StatCard
          label="Leads"
          value={String(totalLeads)}
          sub={`${conversionRate}% conversion rate`}
          icon={Users}
          color="bg-blue-950/40 border-blue-800/30 text-blue-400"
          href="/leads"
        />
        <StatCard
          label="Clients Closed"
          value={String(convertedLeads)}
          sub="Converted leads"
          icon={TrendingUp}
          color="bg-green-950/40 border-green-800/30 text-green-400"
          href="/leads?status=converted"
        />
        <StatCard
          label="Pending Commissions"
          value={`AED ${pendingComm}`}
          sub="Awaiting approval"
          icon={DollarSign}
          color="bg-yellow-950/40 border-yellow-800/30 text-yellow-400"
          href="/commissions"
        />
        <StatCard
          label="Revenue Collected"
          value={`AED ${revenue}`}
          sub="From paid invoices"
          icon={FileText}
          color="bg-emerald-950/40 border-emerald-800/30 text-emerald-400"
          href="/invoices?status=paid"
        />
        <StatCard
          label="Service Requests"
          value={String(totalSR)}
          sub={`${srRate}% completion rate`}
          icon={ClipboardList}
          color="bg-purple-950/40 border-purple-800/30 text-purple-400"
          href="/service-requests"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Lead Trend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-zinc-500" />
            <h2 className="text-zinc-100 font-semibold text-sm">
              Monthly Lead Trend
            </h2>
          </div>
          <p className="text-zinc-500 text-xs mb-6">
            Leads created vs converted per month
          </p>
          {chartData.length === 0 ? (
            <div className="h-24 flex items-center justify-center">
              <p className="text-zinc-600 text-sm">No data for selected period</p>
            </div>
          ) : (
            <>
              <MiniBarChart data={chartData} />
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="w-3 h-2 rounded-sm bg-indigo-600/70 inline-block" />
                  Created
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="w-3 h-2 rounded-sm bg-green-600/70 inline-block" />
                  Converted
                </span>
              </div>
            </>
          )}
        </div>

        {/* Team Performance */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-500" />
            <div>
              <h2 className="text-zinc-100 font-semibold text-sm">
                Team Performance
              </h2>
              <p className="text-zinc-500 text-xs">
                Leads handled, qualified, and converted per team member
              </p>
            </div>
          </div>
          {teamData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-sm">No assigned leads yet</p>
              <p className="text-zinc-600 text-xs mt-1">
                Assign leads to team members to see performance data.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Leads
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Qualified
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Converted
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Conv %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {teamData.map((row) => (
                    <tr
                      key={row.name}
                      className="hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <p className="text-zinc-200 font-medium">{row.name}</p>
                        <p className="text-zinc-500 text-xs capitalize">
                          {row.role.replace("_", " ")}
                        </p>
                      </td>
                      <td className="px-6 py-3 text-right text-zinc-300">
                        {row.total}
                      </td>
                      <td className="px-6 py-3 text-right text-zinc-300">
                        {row.qualified}
                      </td>
                      <td className="px-6 py-3 text-right text-zinc-300">
                        {row.converted}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="text-green-400 font-medium">
                          {row.total > 0
                            ? ((row.converted / row.total) * 100).toFixed(0)
                            : 0}
                          %
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
