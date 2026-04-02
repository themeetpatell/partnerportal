import Link from "next/link"
import {
  db,
  derivePartnerOperationalStatus,
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
} from "drizzle-orm"
import {
  Users,
  UserCheck,
  TrendingUp,
  DollarSign,
  FileText,
  ClipboardList,
  PieChart,
  Building2,
  Receipt,
} from "lucide-react"
import { auth } from "@repo/auth/server"
import {
  AnalyticsGlobalBar,
  PipelineFilters,
  DeliveryFilters,
  PartnerReportFilters,
  FinanceFilters,
} from "@/components/analytics-filter-bar"

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

function formatMoney(value: number) {
  return value.toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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
              className="flex-1 bg-indigo-600/70 rounded-sm min-h-[2px]"
              style={{ height: `${Math.round((d.created / max) * 80)}px` }}
              title={`Created: ${d.created}`}
            />
            <div
              className="flex-1 bg-green-600/70 rounded-sm min-h-[2px]"
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

function BreakdownCard({
  title,
  subtitle,
  icon: Icon,
  rows,
  emptyLabel,
}: {
  title: string
  subtitle: string
  icon: React.ElementType
  rows: { label: string; value: number }[]
  emptyLabel: string
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const max = Math.max(...rows.map((row) => row.value), 1)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
        <Icon className="w-4 h-4 text-zinc-500" />
        <div>
          <h2 className="text-zinc-100 font-semibold text-sm">{title}</h2>
          <p className="text-zinc-500 text-xs">{subtitle}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="flex items-center justify-center px-6 py-14 text-sm text-zinc-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-4 px-6 py-5">
          {rows.map((row) => (
            <div key={row.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-300 capitalize">{row.label}</span>
                <span className="text-zinc-500">
                  {row.value}
                  {total > 0 ? ` • ${Math.round((row.value / total) * 100)}%` : ""}
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800">
                <div
                  className="h-2 rounded-full bg-indigo-500/80"
                  style={{ width: `${Math.max(8, Math.round((row.value / max) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
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
  const partnerType = sp.partnerType
  const teamMemberId = sp.teamMemberId
  const leadStatus = sp.leadStatus
  const leadSource = sp.leadSource
  const serviceStatus = sp.serviceStatus
  const partnerTier = sp.partnerTier

  const leadConditions = [
    isNull(leads.deletedAt),
    buildDateWhere(leads.createdAt, dateRange),
    partnerId ? eq(leads.partnerId, partnerId) : undefined,
    partnerType ? eq(partners.type, partnerType) : undefined,
    teamMemberId ? eq(leads.assignedTo, teamMemberId) : undefined,
    leadStatus ? eq(leads.status, leadStatus) : undefined,
    leadSource ? eq(leads.source, leadSource) : undefined,
  ].filter(Boolean) as Parameters<typeof and>

  const srConditions = [
    isNull(serviceRequests.deletedAt),
    buildDateWhere(serviceRequests.createdAt, dateRange),
    partnerId ? eq(serviceRequests.partnerId, partnerId) : undefined,
    partnerType ? eq(partners.type, partnerType) : undefined,
    teamMemberId ? eq(serviceRequests.assignedTo, teamMemberId) : undefined,
    serviceStatus ? eq(serviceRequests.status, serviceStatus) : undefined,
  ].filter(Boolean) as Parameters<typeof and>

  const invoiceConditions = [
    isNull(invoices.deletedAt),
    buildDateWhere(invoices.createdAt, dateRange),
    partnerId ? eq(invoices.partnerId, partnerId) : undefined,
    partnerType ? eq(partners.type, partnerType) : undefined,
  ].filter(Boolean) as Parameters<typeof and>

  const partnerConditions = [
    isNull(partners.deletedAt),
    buildDateWhere(partners.createdAt, dateRange),
    partnerId ? eq(partners.id, partnerId) : undefined,
    partnerType ? eq(partners.type, partnerType) : undefined,
    partnerTier ? eq(partners.tier, partnerTier) : undefined,
  ].filter(Boolean) as Parameters<typeof and>

  const commissionConditions = [
    partnerId ? eq(commissions.partnerId, partnerId) : undefined,
    buildDateWhere(commissions.createdAt, dateRange),
  ].filter(Boolean) as Parameters<typeof and>

  const [
    totalPartnersResult,
    partnerScopeRows,
    partnersList,
    membersList,
    userSavedFilters,
    pendingCommResult,
    leadRows,
    serviceRows,
    invoiceRows,
  ] = await Promise.all([
    db.select({ count: count() }).from(partners).where(and(...partnerConditions)),
    db
      .select({
        id: partners.id,
        companyName: partners.companyName,
        type: partners.type,
        agreementUrl: partners.agreementUrl,
        contractStatus: partners.contractStatus,
        contractSignedAt: partners.contractSignedAt,
        onboardedAt: partners.onboardedAt,
      })
      .from(partners)
      .where(and(...partnerConditions)),
    db
      .select({ id: partners.id, companyName: partners.companyName })
      .from(partners)
      .where(isNull(partners.deletedAt))
      .orderBy(partners.companyName),
    db
      .select({
        id: teamMembers.id,
        name: teamMembers.name,
        role: teamMembers.role,
        authUserId: teamMembers.authUserId,
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
    db
      .select({ total: sum(commissions.amount) })
      .from(commissions)
      .innerJoin(partners, eq(commissions.partnerId, partners.id))
      .where(
        and(
          ...commissionConditions,
          partnerType ? eq(partners.type, partnerType) : undefined,
          eq(commissions.status, "pending")
        )
      ),
    db
      .select({
        id: leads.id,
        status: leads.status,
        source: leads.source,
        createdAt: leads.createdAt,
        assignedTo: leads.assignedTo,
        partnerId: partners.id,
        partnerName: partners.companyName,
        partnerType: partners.type,
      })
      .from(leads)
      .innerJoin(partners, eq(leads.partnerId, partners.id))
      .where(and(...leadConditions)),
    db
      .select({
        id: serviceRequests.id,
        status: serviceRequests.status,
        partnerType: partners.type,
      })
      .from(serviceRequests)
      .innerJoin(partners, eq(serviceRequests.partnerId, partners.id))
      .where(and(...srConditions)),
    db
      .select({
        id: invoices.id,
        status: invoices.status,
        total: invoices.total,
        partnerType: partners.type,
      })
      .from(invoices)
      .innerJoin(partners, eq(invoices.partnerId, partners.id))
      .where(and(...invoiceConditions)),
  ])

  const totalPartners = Number(totalPartnersResult[0]?.count ?? 0)
  const totalLeads = leadRows.length
  const convertedLeads = leadRows.filter((row) => row.status === "converted").length
  const conversionRate =
    totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0.0"

  const totalServiceRequests = serviceRows.length
  const completedServiceRequests = serviceRows.filter(
    (row) => row.status === "completed"
  ).length
  const serviceCompletionRate =
    totalServiceRequests > 0
      ? ((completedServiceRequests / totalServiceRequests) * 100).toFixed(1)
      : "0.0"

  const totalInvoices = invoiceRows.length
  const paidInvoices = invoiceRows.filter((row) => row.status === "paid").length
  const revenueCollected = invoiceRows
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + Number(row.total ?? 0), 0)
  const pendingCommissions = Number(pendingCommResult[0]?.total ?? 0)

  const now = new Date()
  const monthSeeds = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    return {
      key,
      label: date.toLocaleString("en-AE", { month: "short" }),
      created: 0,
      converted: 0,
    }
  })

  for (const row of leadRows) {
    const createdAt = new Date(row.createdAt)
    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`
    const bucket = monthSeeds.find((item) => item.key === key)
    if (!bucket) continue
    bucket.created += 1
    if (row.status === "converted") {
      bucket.converted += 1
    }
  }

  const chartData = monthSeeds.map(({ label, created, converted }) => ({
    label,
    created,
    converted,
  }))

  const leadStatusMap = new Map<string, number>()
  for (const row of leadRows) {
    leadStatusMap.set(row.status, (leadStatusMap.get(row.status) ?? 0) + 1)
  }
  const leadStatusData = Array.from(leadStatusMap.entries())
    .map(([label, value]) => ({ label: label.replaceAll("_", " "), value }))
    .sort((a, b) => b.value - a.value)

  const serviceStatusMap = new Map<string, number>()
  for (const row of serviceRows) {
    serviceStatusMap.set(row.status, (serviceStatusMap.get(row.status) ?? 0) + 1)
  }
  const serviceStatusData = Array.from(serviceStatusMap.entries())
    .map(([label, value]) => ({ label: label.replaceAll("_", " "), value }))
    .sort((a, b) => b.value - a.value)

  const teamMap = new Map<string, { total: number; qualified: number; converted: number }>()
  for (const row of leadRows) {
    if (!row.assignedTo) continue
    const current = teamMap.get(row.assignedTo) ?? { total: 0, qualified: 0, converted: 0 }
    current.total += 1
    if (row.status === "qualified" || row.status === "converted") {
      current.qualified += 1
    }
    if (row.status === "converted") {
      current.converted += 1
    }
    teamMap.set(row.assignedTo, current)
  }

  const teamData = membersList
    .map((member) => {
      const stats = teamMap.get(member.authUserId) ?? {
        total: 0,
        qualified: 0,
        converted: 0,
      }
      return {
        name: member.name,
        role: member.role,
        total: stats.total,
        qualified: stats.qualified,
        converted: stats.converted,
      }
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const partnerMap = new Map<string, { partnerId: string; companyName: string; totalLeads: number; convertedLeads: number }>()
  for (const row of leadRows) {
    const current = partnerMap.get(row.partnerId) ?? {
      partnerId: row.partnerId,
      companyName: row.partnerName,
      totalLeads: 0,
      convertedLeads: 0,
    }
    current.totalLeads += 1
    if (row.status === "converted") {
      current.convertedLeads += 1
    }
    partnerMap.set(row.partnerId, current)
  }
  const topPartnersData = Array.from(partnerMap.values())
    .sort((a, b) => b.totalLeads - a.totalLeads)
    .slice(0, 6)

  const partnerTypeData = Array.from(
    partnerScopeRows.reduce((map, row) => {
      map.set(row.type, (map.get(row.type) ?? 0) + 1)
      return map
    }, new Map<string, number>())
  )
    .map(([label, value]) => ({ label: label.replaceAll("_", " "), value }))
    .sort((a, b) => b.value - a.value)

  const partnerLeadsMap = leadRows.reduce(
    (map, row) => {
      const current = map.get(row.partnerId) ?? []
      current.push({ status: row.status, createdAt: row.createdAt })
      map.set(row.partnerId, current)
      return map
    },
    new Map<string, { status: string; createdAt: Date }[]>()
  )

  const operationalStatusData = Array.from(
    partnerScopeRows.reduce((map, partnerRow) => {
      const status = derivePartnerOperationalStatus(
        {
          contractStatus: partnerRow.contractStatus,
          contractSignedAt: partnerRow.contractSignedAt,
          onboardedAt: partnerRow.onboardedAt,
        },
        partnerLeadsMap.get(partnerRow.id) ?? []
      )
      map.set(status, (map.get(status) ?? 0) + 1)
      return map
    }, new Map<string, number>())
  )
    .map(([label, value]) => ({ label: label.replaceAll("_", " "), value }))
    .sort((a, b) => b.value - a.value)

  const currentFilters = {
    dateRange: sp.dateRange,
    partnerId: sp.partnerId,
    partnerType: sp.partnerType,
    teamMemberId: sp.teamMemberId,
    leadStatus: sp.leadStatus,
    leadSource: sp.leadSource,
    serviceStatus: sp.serviceStatus,
    partnerTier: sp.partnerTier,
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
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics — {filterLabel}</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Pipeline, delivery, partner, and finance reports in one admin view
        </p>
      </div>

      <AnalyticsGlobalBar
        currentFilters={currentFilters}
        savedFilters={userSavedFilters}
      />

      <section className="space-y-6">
        <SectionHeader
          title="Pipeline Report"
          subtitle="Lead acquisition, conversion movement, and pipeline mix"
        />
        <PipelineFilters
          partners={partnersList}
          teamMembers={membersList.map((m) => ({
            id: m.id,
            name: m.name,
            authUserId: m.authUserId,
          }))}
          currentFilters={currentFilters}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
            label="Total Partners"
            value={String(totalPartners)}
            sub="Active partner accounts in scope"
            icon={UserCheck}
            color="bg-indigo-950/40 border-indigo-800/30 text-indigo-400"
            href="/partners"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-zinc-500" />
              <h2 className="text-zinc-100 font-semibold text-sm">Monthly Lead Trend</h2>
            </div>
            <p className="text-zinc-500 text-xs mb-6">
              Leads created vs converted over the last six months
            </p>
            {chartData.every((row) => row.created === 0 && row.converted === 0) ? (
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

          <BreakdownCard
            title="Lead Status Mix"
            subtitle="How the current pipeline is distributed by stage"
            icon={PieChart}
            rows={leadStatusData}
            emptyLabel="No lead status data for the selected filters"
          />
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeader
          title="Delivery Report"
          subtitle="Service operations, completion rate, and team throughput"
        />
        <DeliveryFilters
          partners={partnersList}
          teamMembers={membersList.map((m) => ({
            id: m.id,
            name: m.name,
            authUserId: m.authUserId,
          }))}
          currentFilters={currentFilters}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="Service Requests"
            value={String(totalServiceRequests)}
            sub={`${serviceCompletionRate}% completion rate`}
            icon={ClipboardList}
            color="bg-purple-950/40 border-purple-800/30 text-purple-400"
            href="/service-requests"
          />
          <StatCard
            label="Pending Commissions"
            value={`AED ${formatMoney(pendingCommissions)}`}
            sub="Awaiting approval"
            icon={DollarSign}
            color="bg-yellow-950/40 border-yellow-800/30 text-yellow-400"
            href="/commissions"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BreakdownCard
            title="Service Status Mix"
            subtitle="Operational load across delivery stages"
            icon={ClipboardList}
            rows={serviceStatusData}
            emptyLabel="No service request data for the selected filters"
          />

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-500" />
              <div>
                <h2 className="text-zinc-100 font-semibold text-sm">Team Performance</h2>
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
                      <tr key={row.name} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-6 py-3">
                          <p className="text-zinc-200 font-medium">{row.name}</p>
                          <p className="text-zinc-500 text-xs capitalize">
                            {row.role.replace("_", " ")}
                          </p>
                        </td>
                        <td className="px-6 py-3 text-right text-zinc-300">{row.total}</td>
                        <td className="px-6 py-3 text-right text-zinc-300">{row.qualified}</td>
                        <td className="px-6 py-3 text-right text-zinc-300">{row.converted}</td>
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
      </section>

      <section className="space-y-6">
        <SectionHeader
          title="Partner Report"
          subtitle="Partner contribution, lifecycle, and type composition"
        />
        <PartnerReportFilters currentFilters={currentFilters} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="Total Partners"
            value={String(totalPartners)}
            sub="Partner accounts contributing to this scope"
            icon={UserCheck}
            color="bg-indigo-950/40 border-indigo-800/30 text-indigo-400"
            href="/partners"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <BreakdownCard
            title="Partner Type Mix"
            subtitle="Referral versus channel contribution in the current scope"
            icon={Building2}
            rows={partnerTypeData}
            emptyLabel="No partner type data for the selected filters"
          />

          <BreakdownCard
            title="Partner Lifecycle Status"
            subtitle="Automated status based on contract and qualified lead recency"
            icon={UserCheck}
            rows={operationalStatusData}
            emptyLabel="No partner lifecycle data for the selected filters"
          />

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-zinc-500" />
              <div>
                <h2 className="text-zinc-100 font-semibold text-sm">
                  Top Partners By Lead Volume
                </h2>
                <p className="text-zinc-500 text-xs">
                  Which partners are bringing the most pipeline and conversions
                </p>
              </div>
            </div>
            {topPartnersData.length === 0 ? (
              <div className="px-6 py-14 text-center text-sm text-zinc-500">
                No partner lead activity for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Partner
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Leads
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
                    {topPartnersData.map((row) => (
                      <tr key={row.partnerId} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-6 py-3">
                          <p className="text-zinc-200 font-medium">{row.companyName}</p>
                        </td>
                        <td className="px-6 py-3 text-right text-zinc-300">{row.totalLeads}</td>
                        <td className="px-6 py-3 text-right text-zinc-300">{row.convertedLeads}</td>
                        <td className="px-6 py-3 text-right">
                          <span className="text-green-400 font-medium">
                            {row.totalLeads > 0
                              ? ((row.convertedLeads / row.totalLeads) * 100).toFixed(0)
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
      </section>

      <section className="space-y-6">
        <SectionHeader
          title="Finance Report"
          subtitle="Invoice volume, revenue collection, and pending commissions"
        />
        <FinanceFilters
          partners={partnersList}
          currentFilters={currentFilters}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard
            label="Revenue Collected"
            value={`AED ${formatMoney(revenueCollected)}`}
            sub="From paid invoices"
            icon={FileText}
            color="bg-emerald-950/40 border-emerald-800/30 text-emerald-400"
            href="/invoices?status=paid"
          />
          <StatCard
            label="Invoices Issued"
            value={String(totalInvoices)}
            sub="All invoices in selected scope"
            icon={Receipt}
            color="bg-cyan-950/40 border-cyan-800/30 text-cyan-400"
            href="/invoices"
          />
          <StatCard
            label="Paid Invoices"
            value={String(paidInvoices)}
            sub="Invoices already collected"
            icon={DollarSign}
            color="bg-green-950/40 border-green-800/30 text-green-400"
            href="/invoices?status=paid"
          />
        </div>
      </section>
    </div>
  )
}
