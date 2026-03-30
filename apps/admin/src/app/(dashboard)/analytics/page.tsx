import Link from "next/link"
import { Suspense } from "react"
import { db, leads, commissions, invoices, partners, serviceRequests, teamMembers } from "@repo/db"
import { count, sum, eq, desc, isNotNull, sql, gte, and, lt } from "drizzle-orm"
import {
  BarChart3, Users, DollarSign, TrendingUp, ClipboardList,
  FileText, Trophy, UserCheck, ArrowRight, Target,
} from "lucide-react"
import { AnalyticsFilters } from "./_components/filters"

// ─── date helpers ─────────────────────────────────────────────────────────────

function getDateRange(period: string): { from: Date | null; to: Date | null } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (period) {
    case "this_month":
      return { from: new Date(y, m, 1), to: null }
    case "last_month":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) }
    case "this_quarter": {
      const q = Math.floor(m / 3)
      return { from: new Date(y, q * 3, 1), to: null }
    }
    case "last_quarter": {
      const q = Math.floor(m / 3)
      const pq = q === 0 ? 3 : q - 1
      const py = q === 0 ? y - 1 : y
      return { from: new Date(py, pq * 3, 1), to: new Date(py, pq * 3 + 3, 1) }
    }
    case "this_year":
      return { from: new Date(y, 0, 1), to: null }
    default:
      return { from: null, to: null }
  }
}

function dateWhere(
  col: typeof leads.createdAt | typeof serviceRequests.createdAt,
  from: Date | null,
  to: Date | null
) {
  if (from && to) return and(gte(col, from), lt(col, to))
  if (from) return gte(col, from)
  return undefined
}

// ─── render helpers ───────────────────────────────────────────────────────────

function fmtAED(val: string | number | null | undefined) {
  return Number(val ?? 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function pct(num: number, den: number) {
  if (!den) return "0.0"
  return ((num / den) * 100).toFixed(1)
}
function SectionHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-white/6 border border-white/8 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
      )}
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
function RoleBadge({ role }: { role: string | null }) {
  const r = role ?? "unknown"
  const map: Record<string, string> = {
    admin: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
    finance: "bg-green-950/60 border-green-800/40 text-green-400",
    ops: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    sales: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
    partnership: "bg-orange-950/60 border-orange-800/40 text-orange-400",
    appointment_setter: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${map[r] ?? "bg-white/6 border-white/10 text-slate-400"}`}>
      {r.replace(/_/g, " ")}
    </span>
  )
}
function MiniBar({ value, max, color = "bg-indigo-500" }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="h-1 bg-white/6 rounded-full overflow-hidden w-20">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; partnerId?: string }>
}) {
  const { period = "", partnerId = "" } = await searchParams
  const { from, to } = getDateRange(period)

  // Lead date filter — applied to most lead-based queries
  const leadDateWhere = dateWhere(leads.createdAt, from, to)
  // Lead date + partner filter
  const leadWhere = and(
    leadDateWhere,
    partnerId ? eq(leads.partnerId, partnerId) : undefined
  )

  const [
    [totalPartnersRow],
    [totalLeadsRow],
    [convertedLeadsRow],
    [pendingCommRow],
    [paidCommRow],
    [paidInvRow],
    [totalSRRow],
    [completedSRRow],
    allPartners,
    teamPerf,
    topPartnersByLeads,
    topPartnersByRevenue,
    clients,
    partnerStatus,
    monthlyLeads,
    leadStages,
    commBreakdown,
  ] = await Promise.all([
    db.select({ c: count() }).from(partners),
    db.select({ c: count() }).from(leads).where(leadWhere),
    db.select({ c: count() }).from(leads).where(and(leadWhere, eq(leads.status, "converted"))),
    db.select({ t: sum(commissions.amount) }).from(commissions).where(eq(commissions.status, "pending")),
    db.select({ t: sum(commissions.amount) }).from(commissions).where(eq(commissions.status, "paid")),
    db.select({ t: sum(invoices.total) }).from(invoices).where(eq(invoices.status, "paid")),
    db.select({ c: count() }).from(serviceRequests).where(dateWhere(serviceRequests.createdAt, from, to) ?? undefined),
    db.select({ c: count() }).from(serviceRequests).where(and(dateWhere(serviceRequests.createdAt, from, to), eq(serviceRequests.status, "completed"))),

    // All partners for filter dropdown
    db.select({ id: partners.id, companyName: partners.companyName }).from(partners).orderBy(partners.companyName),

    // Team performance
    db.select({
      assignedTo: leads.assignedTo,
      memberName: teamMembers.name,
      memberRole: teamMembers.role,
      total: count(),
      converted: sql<number>`CAST(SUM(CASE WHEN ${leads.status} = 'converted' THEN 1 ELSE 0 END) AS integer)`,
      inPipeline: sql<number>`CAST(SUM(CASE WHEN ${leads.status} NOT IN ('converted','rejected') THEN 1 ELSE 0 END) AS integer)`,
      qualified: sql<number>`CAST(SUM(CASE WHEN ${leads.status} IN ('qualified','proposal_sent','converted') THEN 1 ELSE 0 END) AS integer)`,
    })
    .from(leads)
    .leftJoin(teamMembers, eq(leads.assignedTo, teamMembers.clerkUserId))
    .where(and(isNotNull(leads.assignedTo), leadDateWhere))
    .groupBy(leads.assignedTo, teamMembers.name, teamMembers.role)
    .orderBy(desc(count())),

    // Top partners by leads
    db.select({
      id: partners.id,
      companyName: partners.companyName,
      contactName: partners.contactName,
      type: partners.type,
      totalLeads: count(leads.id),
      converted: sql<number>`CAST(SUM(CASE WHEN ${leads.status} = 'converted' THEN 1 ELSE 0 END) AS integer)`,
    })
    .from(partners)
    .leftJoin(leads, and(eq(leads.partnerId, partners.id), leadDateWhere ?? undefined))
    .groupBy(partners.id, partners.companyName, partners.contactName, partners.type)
    .orderBy(desc(count(leads.id)))
    .limit(10),

    // Top partners by commissions
    db.select({
      id: partners.id,
      companyName: partners.companyName,
      totalCommissions: sum(commissions.amount),
    })
    .from(partners)
    .leftJoin(commissions, eq(commissions.partnerId, partners.id))
    .groupBy(partners.id, partners.companyName)
    .orderBy(desc(sum(commissions.amount)))
    .limit(10),

    // Converted clients
    db.select({
      id: leads.id,
      customerName: leads.customerName,
      customerCompany: leads.customerCompany,
      customerEmail: leads.customerEmail,
      serviceInterest: leads.serviceInterest,
      convertedAt: leads.convertedAt,
      memberName: teamMembers.name,
      memberRole: teamMembers.role,
      partnerCompany: partners.companyName,
    })
    .from(leads)
    .leftJoin(teamMembers, eq(leads.assignedTo, teamMembers.clerkUserId))
    .leftJoin(partners, eq(leads.partnerId, partners.id))
    .where(and(eq(leads.status, "converted"), leadDateWhere))
    .orderBy(desc(leads.convertedAt))
    .limit(25),

    // Partner status breakdown
    db.select({ status: partners.status, c: count() }).from(partners).groupBy(partners.status),

    // Monthly trend (last 6 months)
    db.select({
      label: sql<string>`TO_CHAR(DATE_TRUNC('month', ${leads.createdAt}), 'Mon YYYY')`,
      total: count(),
      converted: sql<number>`CAST(SUM(CASE WHEN ${leads.status} = 'converted' THEN 1 ELSE 0 END) AS integer)`,
    })
    .from(leads)
    .where(partnerId ? eq(leads.partnerId, partnerId) : undefined)
    .groupBy(sql`DATE_TRUNC('month', ${leads.createdAt})`)
    .orderBy(sql`DATE_TRUNC('month', ${leads.createdAt}) DESC`)
    .limit(6),

    // Lead stage breakdown
    db.select({ status: leads.status, c: count() }).from(leads).where(leadWhere).groupBy(leads.status),

    // Commission breakdown
    db.select({ status: commissions.status, t: sum(commissions.amount) }).from(commissions).groupBy(commissions.status),
  ])

  const totalLeadsCount = totalLeadsRow?.c ?? 0
  const convertedCount = convertedLeadsRow?.c ?? 0
  const convRate = pct(convertedCount, totalLeadsCount)
  const srCompletion = pct(completedSRRow?.c ?? 0, totalSRRow?.c ?? 0)

  const kpis = [
    { label: "Total Partners", value: String(totalPartnersRow?.c ?? 0), sub: "Registered accounts", icon: Users, color: "text-indigo-400", bg: "bg-indigo-950/40 border-indigo-800/30" },
    { label: "Leads", value: String(totalLeadsCount), sub: `${convRate}% conversion rate`, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-950/40 border-blue-800/30" },
    { label: "Clients Closed", value: String(convertedCount), sub: "Converted leads", icon: UserCheck, color: "text-green-400", bg: "bg-green-950/40 border-green-800/30" },
    { label: "Pending Commissions", value: `AED ${fmtAED(pendingCommRow?.t)}`, sub: "Awaiting approval", icon: DollarSign, color: "text-yellow-400", bg: "bg-yellow-950/40 border-yellow-800/30" },
    { label: "Revenue Collected", value: `AED ${fmtAED(paidInvRow?.t)}`, sub: "From paid invoices", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-800/30" },
    { label: "Service Requests", value: String(totalSRRow?.c ?? 0), sub: `${srCompletion}% completion rate`, icon: ClipboardList, color: "text-indigo-400", bg: "bg-indigo-950/40 border-indigo-800/30" },
  ]

  const maxLeads = Math.max(...teamPerf.map((r) => r.total), 1)
  const maxPartnerLeads = Math.max(...topPartnersByLeads.map((r) => r.totalLeads), 1)
  const maxPartnerRevenue = Math.max(...topPartnersByRevenue.map((r) => Number(r.totalCommissions ?? 0)), 1)
  const maxMonthly = Math.max(...monthlyLeads.map((r) => r.total), 1)
  const totalLeadStages = leadStages.reduce((a, r) => a + r.c, 0)
  const totalComm = commBreakdown.reduce((a, r) => a + Number(r.t ?? 0), 0)
  const totalPartnerStatus = partnerStatus.reduce((a, r) => a + r.c, 0)

  const leadStageOrder = ["submitted", "in_review", "qualified", "proposal_sent", "converted", "rejected"]
  const leadStageColors: Record<string, string> = {
    submitted: "bg-blue-500", in_review: "bg-purple-500", qualified: "bg-indigo-500",
    proposal_sent: "bg-yellow-500", converted: "bg-green-500", rejected: "bg-red-500",
  }
  const commColors: Record<string, string> = {
    pending: "bg-yellow-500", approved: "bg-indigo-500", processing: "bg-blue-500",
    paid: "bg-green-500", disputed: "bg-red-500",
  }
  const partnerStatusColors: Record<string, string> = {
    pending: "bg-yellow-500", approved: "bg-green-500", rejected: "bg-red-500", suspended: "bg-zinc-500",
  }

  const periodLabel = period
    ? `— ${period.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`
    : "— All Time"

  return (
    <div className="space-y-10">
      {/* Header + Filters */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics {periodLabel}</h1>
          <p className="text-slate-400 text-sm mt-1">Platform-wide performance overview</p>
        </div>
        <Suspense fallback={null}>
          <AnalyticsFilters partners={allPartners} />
        </Suspense>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="surface-card rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${k.bg}`}>
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{k.value}</p>
                <p className="text-zinc-300 text-sm font-medium">{k.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{k.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Monthly Trend ── */}
      <div className="space-y-3">
        <SectionHeader title="Monthly Lead Trend" subtitle="Leads created vs converted per month" icon={BarChart3} />
        <div className="surface-card rounded-2xl p-6">
          {monthlyLeads.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-8">No data for selected period</p>
          ) : (
            <div className="space-y-3">
              {[...monthlyLeads].reverse().map((row) => {
                const convPct = row.total > 0 ? Math.round((Number(row.converted) / row.total) * 100) : 0
                const barW = Math.round((row.total / maxMonthly) * 100)
                return (
                  <div key={row.label} className="grid grid-cols-[100px_1fr_80px_60px] items-center gap-3">
                    <span className="text-slate-400 text-xs font-medium">{row.label}</span>
                    <div className="relative h-5 bg-white/6 rounded overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-indigo-600/60 rounded" style={{ width: `${barW}%` }} />
                      <div className="absolute inset-y-0 left-0 bg-green-500/80 rounded" style={{ width: `${Math.round((Number(row.converted) / maxMonthly) * 100)}%` }} />
                    </div>
                    <span className="text-slate-300 text-xs text-right font-mono">{row.total} leads</span>
                    <span className="text-green-400 text-xs text-right font-mono">{convPct}%</span>
                  </div>
                )
              })}
              <div className="flex items-center gap-5 pt-2">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-600/60" /><span className="text-slate-500 text-xs">Total leads</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500/80" /><span className="text-slate-500 text-xs">Converted</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Team Performance ── */}
      <div className="space-y-3">
        <SectionHeader title="Team Performance" subtitle="Leads handled, qualified, and converted per team member" icon={Target} />
        <div className="surface-card rounded-2xl overflow-hidden">
          {teamPerf.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-white/6 border border-white/8 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-slate-400 font-medium text-sm">No assigned leads yet</p>
              <p className="text-slate-600 text-xs mt-1">Assign leads to team members to see performance data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {["#", "Team Member", "Total Leads", "Qualified+", "Converted", "Conv. Rate", "In Pipeline"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider first:w-10">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {teamPerf.map((row, i) => {
                    const cr = pct(Number(row.converted), row.total)
                    return (
                      <tr key={row.assignedTo} className="hover:bg-white/[0.04] transition-colors">
                        <td className="px-5 py-3.5">
                          <span className={`text-sm font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-600" : "text-slate-600"}`}>#{i + 1}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-indigo-900/60 border border-indigo-700/40 flex items-center justify-center flex-shrink-0">
                              <span className="text-indigo-300 text-xs font-semibold">
                                {(row.memberName ?? row.assignedTo ?? "?").slice(0, 1).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{row.memberName ?? <span className="text-slate-500 font-mono text-xs">{row.assignedTo?.slice(0, 12)}…</span>}</p>
                              <RoleBadge role={row.memberRole} />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-semibold">{row.total}</span>
                            <MiniBar value={row.total} max={maxLeads} color="bg-indigo-500" />
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><span className="text-indigo-300 text-sm">{Number(row.qualified)}</span></td>
                        <td className="px-5 py-3.5"><span className="text-green-400 text-sm font-semibold">{Number(row.converted)}</span></td>
                        <td className="px-5 py-3.5">
                          <span className={`text-sm font-semibold ${Number(cr) >= 30 ? "text-green-400" : Number(cr) >= 15 ? "text-yellow-400" : "text-slate-400"}`}>{cr}%</span>
                        </td>
                        <td className="px-5 py-3.5"><span className="text-blue-300 text-sm">{Number(row.inPipeline)}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Partner Performance ── */}
      <div className="space-y-3">
        <SectionHeader title="Partner Performance" subtitle="Top partners by activity and commission revenue" icon={Trophy} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="surface-card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <p className="text-sm font-semibold text-white">Top Partners by Leads</p>
            </div>
            {topPartnersByLeads.filter((r) => r.totalLeads > 0).length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-10">No data</p>
            ) : (
              <div className="divide-y divide-white/8">
                {topPartnersByLeads.filter((r) => r.totalLeads > 0).slice(0, 8).map((row, i) => (
                  <div key={row.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.03]">
                    <span className="text-slate-600 text-xs w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{row.companyName}</p>
                      <p className="text-slate-500 text-xs capitalize">{row.type} partner</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-white text-sm font-semibold">{row.totalLeads}</p>
                        <p className="text-slate-500 text-xs">leads</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 text-sm font-semibold">{Number(row.converted)}</p>
                        <p className="text-slate-500 text-xs">closed</p>
                      </div>
                      <MiniBar value={row.totalLeads} max={maxPartnerLeads} color="bg-indigo-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <p className="text-sm font-semibold text-white">Top Partners by Commission Revenue</p>
            </div>
            {topPartnersByRevenue.filter((r) => Number(r.totalCommissions ?? 0) > 0).length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-10">No data</p>
            ) : (
              <div className="divide-y divide-white/8">
                {topPartnersByRevenue.filter((r) => Number(r.totalCommissions ?? 0) > 0).slice(0, 8).map((row, i) => {
                  const val = Number(row.totalCommissions ?? 0)
                  return (
                    <div key={row.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.03]">
                      <span className="text-slate-600 text-xs w-5 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{row.companyName}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-emerald-400 text-sm font-semibold font-mono">AED {fmtAED(val)}</span>
                        <MiniBar value={val} max={maxPartnerRevenue} color="bg-emerald-500" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Client Pipeline ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionHeader title="Client Pipeline" subtitle="Converted leads — closed clients" icon={UserCheck} />
          <Link href="/leads?status=converted" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
            View all leads <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="surface-card rounded-2xl overflow-hidden">
          {clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-white/6 border border-white/8 flex items-center justify-center mb-3">
                <UserCheck className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-slate-400 font-medium text-sm">No clients for selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Client", "Services", "Partner", "Closed By", "Converted", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider last:text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {clients.map((c) => {
                    const svcs = (() => { try { return (JSON.parse(c.serviceInterest) as string[]).slice(0, 2).join(", ") } catch { return c.serviceInterest } })()
                    return (
                      <tr key={c.id} className="hover:bg-white/[0.04] transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-white text-sm font-medium">{c.customerName}</p>
                          <p className="text-slate-500 text-xs">{c.customerCompany || c.customerEmail}</p>
                        </td>
                        <td className="px-5 py-3.5"><p className="text-slate-300 text-xs max-w-[160px] truncate">{svcs || "—"}</p></td>
                        <td className="px-5 py-3.5"><p className="text-slate-300 text-sm">{c.partnerCompany ?? "—"}</p></td>
                        <td className="px-5 py-3.5">
                          {c.memberName ? (
                            <div><p className="text-slate-200 text-sm">{c.memberName}</p><RoleBadge role={c.memberRole} /></div>
                          ) : <span className="text-slate-600 text-sm">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-slate-400 text-sm">
                            {c.convertedAt ? new Date(c.convertedAt).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link href={`/leads/${c.id}`} className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                            View <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Pipeline Breakdowns ── */}
      <div className="space-y-3">
        <SectionHeader title="Pipeline Breakdowns" subtitle="Lead stages, commissions, and partner status" icon={BarChart3} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="surface-card rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-4">Lead Stage Distribution</p>
            {leadStages.length === 0 ? <p className="text-slate-600 text-sm text-center py-8">No data</p> : (
              <div className="space-y-3">
                {leadStageOrder.map((s) => leadStages.find((r) => r.status === s)).filter(Boolean).map((row) => {
                  const p = totalLeadStages > 0 ? Math.round((row!.c / totalLeadStages) * 100) : 0
                  return (
                    <div key={row!.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-zinc-300 text-xs capitalize">{row!.status.replace(/_/g, " ")}</span>
                        <span className="text-slate-400 text-xs font-mono">{row!.c} ({p}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${leadStageColors[row!.status] ?? "bg-zinc-500"}`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="surface-card rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-4">Commission Status (AED)</p>
            {commBreakdown.length === 0 ? <p className="text-slate-600 text-sm text-center py-8">No data</p> : (
              <div className="space-y-3">
                {commBreakdown.map((row) => {
                  const val = Number(row.t ?? 0)
                  const p = totalComm > 0 ? Math.round((val / totalComm) * 100) : 0
                  return (
                    <div key={row.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-zinc-300 text-xs capitalize">{row.status}</span>
                        <span className="text-slate-400 text-xs font-mono">{fmtAED(val)} ({p}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${commColors[row.status] ?? "bg-zinc-500"}`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="surface-card rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-4">Partner Status</p>
            {partnerStatus.length === 0 ? <p className="text-slate-600 text-sm text-center py-8">No data</p> : (
              <div className="space-y-3">
                {partnerStatus.map((row) => {
                  const p = totalPartnerStatus > 0 ? Math.round((row.c / totalPartnerStatus) * 100) : 0
                  return (
                    <div key={row.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-zinc-300 text-xs capitalize">{row.status}</span>
                        <span className="text-slate-400 text-xs font-mono">{row.c} ({p}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${partnerStatusColors[row.status] ?? "bg-zinc-500"}`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
