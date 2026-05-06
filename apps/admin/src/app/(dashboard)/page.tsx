import Link from "next/link"
import { currentUser } from "@repo/auth/server"
import { db, partners, leads, commissions, invoices } from "@repo/db"
import { eq, count, sum, and, isNull, desc, ne } from "drizzle-orm"
import {
  UserCheck,
  Clock,
  Users,
  AlertCircle,
  DollarSign,
  ArrowRight,
  Building2,
  Trophy,
  Receipt,
  BadgeCheck,
} from "lucide-react"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasModuleAccess } from "@/lib/rbac"
import {
  partnerScopeWhere,
  resolvePartnerScopeForActor,
  scopedPartnerFilters,
} from "@/lib/row-scope"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    approved: "bg-green-950/60 border-green-800/40 text-green-400",
    rejected: "bg-red-950/60 border-red-800/40 text-red-400",
    suspended: "bg-white/6 border-white/10 text-slate-400",
    submitted: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    in_review: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
    converted: "bg-green-950/60 border-green-800/40 text-green-400",
    lead_approved: "bg-sky-950/60 border-sky-800/40 text-sky-400",
    lead_follow_up: "bg-cyan-950/60 border-cyan-800/40 text-cyan-400",
    lead_qualified: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
    proposal_sent: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    deal_won: "bg-green-950/60 border-green-800/40 text-green-400",
    deal_lost: "bg-red-950/60 border-red-800/40 text-red-400",
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[status] ?? "bg-white/6 border-white/10 text-slate-400"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}

export default async function AdminOverviewPage() {
  const [member, actor] = await Promise.all([
    getCurrentActiveTeamMember(),
    currentUser(),
  ])
  const tenantId = getRequiredTenantId()
  const scope =
    actor?.id === undefined || !member
      ? ({ kind: "restricted" as const, partnerIds: [] as readonly string[] })
      : await resolvePartnerScopeForActor({
          tenantId,
          actorUserId: actor.id,
          member,
        })

  const partnerBase = and(
    eq(partners.tenantId, tenantId),
    isNull(partners.deletedAt),
    partnerScopeWhere(scope, partners.id) ?? undefined,
  )

  const leadBase = and(
    eq(leads.tenantId, tenantId),
    isNull(leads.deletedAt),
    scopedPartnerFilters(scope, leads.partnerId, null) ?? undefined,
  )

  const commissionPendingBase = and(
    eq(commissions.tenantId, tenantId),
    eq(commissions.status, "pending"),
    scopedPartnerFilters(scope, commissions.partnerId, null) ?? undefined,
  )

  const canPartners = member
    ? hasModuleAccess(member.role, member.permissions, "partners")
    : false
  const canLeads =
    member &&
    (hasModuleAccess(member.role, member.permissions, "leads") ||
      hasModuleAccess(member.role, member.permissions, "services"))
  const canCommissions = member
    ? hasModuleAccess(member.role, member.permissions, "commissions")
    : false
  const canInvoices = member
    ? hasModuleAccess(member.role, member.permissions, "invoices")
    : false

  const invoiceBase = and(
    eq(invoices.tenantId, tenantId),
    isNull(invoices.deletedAt),
    scopedPartnerFilters(scope, invoices.partnerId, null) ?? undefined,
  )

  const [
    totalPartnersResult,
    pendingPartnersResult,
    totalLeadsResult,
    submittedLeadsResult,
    pendingCommissionsResult,
    approvedPartnersResult,
    wonLeadsResult,
    openInvoicesResult,
    pendingPartnersList,
    recentLeadsList,
  ] = await Promise.all([
    canPartners
      ? db.select({ count: count() }).from(partners).where(partnerBase)
      : Promise.resolve([{ count: 0 }]),
    canPartners
      ? db
          .select({ count: count() })
          .from(partners)
          .where(and(partnerBase, eq(partners.status, "pending")))
      : Promise.resolve([{ count: 0 }]),
    canLeads
      ? db.select({ count: count() }).from(leads).where(leadBase)
      : Promise.resolve([{ count: 0 }]),
    canLeads
      ? db
          .select({ count: count() })
          .from(leads)
          .where(and(leadBase, eq(leads.status, "submitted")))
      : Promise.resolve([{ count: 0 }]),
    canCommissions
      ? db
          .select({ total: sum(commissions.amount) })
          .from(commissions)
          .where(commissionPendingBase)
      : Promise.resolve([{ total: null }]),
    canPartners
      ? db
          .select({ count: count() })
          .from(partners)
          .where(and(partnerBase, eq(partners.status, "approved")))
      : Promise.resolve([{ count: 0 }]),
    canLeads
      ? db
          .select({ count: count() })
          .from(leads)
          .where(and(leadBase, eq(leads.status, "deal_won")))
      : Promise.resolve([{ count: 0 }]),
    canInvoices
      ? db
          .select({ count: count() })
          .from(invoices)
          .where(
            and(
              invoiceBase,
              ne(invoices.status, "paid"),
              ne(invoices.status, "cancelled"),
            ),
          )
      : Promise.resolve([{ count: 0 }]),
    canPartners
      ? db
          .select({
            id: partners.id,
            companyName: partners.companyName,
            contactName: partners.contactName,
            type: partners.type,
            createdAt: partners.createdAt,
          })
          .from(partners)
          .where(and(partnerBase, eq(partners.status, "pending")))
          .orderBy(partners.createdAt)
          .limit(5)
      : Promise.resolve([]),
    canLeads
      ? db
          .select({
            id: leads.id,
            customerName: leads.customerName,
            customerCompany: leads.customerCompany,
            serviceInterest: leads.serviceInterest,
            status: leads.status,
            createdAt: leads.createdAt,
          })
          .from(leads)
          .where(leadBase)
          .orderBy(desc(leads.createdAt))
          .limit(5)
      : Promise.resolve([]),
  ])

  const totalPartners = Number(totalPartnersResult[0]?.count ?? 0)
  const pendingPartners = Number(pendingPartnersResult[0]?.count ?? 0)
  const totalLeads = Number(totalLeadsResult[0]?.count ?? 0)
  const submittedLeads = Number(submittedLeadsResult[0]?.count ?? 0)
  const pendingCommissionsTotal = Number(
    pendingCommissionsResult[0]?.total ?? 0,
  ).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const approvedPartners = Number(approvedPartnersResult[0]?.count ?? 0)
  const wonLeads = Number(wonLeadsResult[0]?.count ?? 0)
  const openInvoices = Number(openInvoicesResult[0]?.count ?? 0)

  const kpiCards = [
    canPartners && {
      label: "Total Partners",
      value: String(totalPartners),
      icon: UserCheck,
      description: "All registered partners in your scope",
      color: "text-indigo-400",
      bg: "bg-indigo-950/40 border-indigo-800/30",
    },
    canPartners && {
      label: "Pending Approvals",
      value: String(pendingPartners),
      icon: Clock,
      description: "Partners awaiting review",
      color: "text-yellow-400",
      bg: "bg-yellow-950/40 border-yellow-800/30",
    },
    canPartners && {
      label: "Active Partners",
      value: String(approvedPartners),
      icon: BadgeCheck,
      description: "Approved workspace accounts in your scope",
      color: "text-emerald-400",
      bg: "bg-emerald-950/40 border-emerald-800/30",
    },
    canLeads && {
      label: "Total Leads",
      value: String(totalLeads),
      icon: Users,
      description: "Leads in your scope",
      color: "text-blue-400",
      bg: "bg-blue-950/40 border-blue-800/30",
    },
    canLeads && {
      label: "Leads Needing Review",
      value: String(submittedLeads),
      icon: AlertCircle,
      description: "Submitted, not yet reviewed",
      color: "text-orange-400",
      bg: "bg-orange-950/40 border-orange-800/30",
    },
    canLeads && {
      label: "Closed Won",
      value: String(wonLeads),
      icon: Trophy,
      description: "Lifetime wins in your lead scope",
      color: "text-green-400",
      bg: "bg-green-950/40 border-green-800/30",
    },
    canCommissions && {
      label: "Commissions Pending",
      value: `AED ${pendingCommissionsTotal}`,
      icon: DollarSign,
      description: "Awaiting approval (your scope)",
      color: "text-green-400",
      bg: "bg-green-950/40 border-green-800/30",
    },
    canInvoices && {
      label: "Open Invoices",
      value: String(openInvoices),
      icon: Receipt,
      description: "Draft, sent, or overdue — not paid or voided",
      color: "text-cyan-400",
      bg: "bg-cyan-950/40 border-cyan-800/30",
    },
  ].filter(Boolean) as {
    label: string
    value: string
    icon: typeof UserCheck
    description: string
    color: string
    bg: string
  }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Home</h1>
        <p className="text-slate-400 text-sm mt-1">
          Snapshot of partners, leads, and commissions in your scope — open modules from the
          sidebar for full lists.
        </p>
      </div>

      {kpiCards.length === 0 ? (
        <p className="text-slate-500 text-sm">
          You don&apos;t have access to pipeline, partner, or commission modules. Use{" "}
          <Link href="/settings" className="text-indigo-400 hover:text-indigo-300">
            Settings
          </Link>{" "}
          if your role should include them.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="surface-card rounded-2xl p-5 transition-colors hover:border-white/20"
            >
              <div className="mb-4 flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border ${card.bg}`}
                >
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-400">{card.label}</p>
                <p className="mt-1 text-xs text-slate-500">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {(canPartners || canLeads) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {canPartners && (
            <div className="surface-card rounded-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h2 className="flex items-center gap-2 font-semibold text-white">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  Pending Partner Approvals
                </h2>
                <Link
                  href="/partners?status=pending"
                  className="flex items-center gap-1 text-xs text-indigo-400 transition-colors hover:text-indigo-300"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/8">
                {pendingPartnersList.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <p className="text-sm text-slate-500">No pending approvals</p>
                  </div>
                ) : (
                  pendingPartnersList.map((partner) => (
                    <div
                      key={partner.id}
                      className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
                          <Building2 className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {partner.companyName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {partner.contactName} &middot;{" "}
                            <span className="capitalize">{partner.type}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        <p className="hidden text-xs text-slate-600 sm:block">
                          {new Date(partner.createdAt).toLocaleDateString("en-AE", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                        <Link
                          href={`/partners/${partner.id}`}
                          className="rounded-md bg-indigo-400 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {canLeads && (
            <div className="surface-card rounded-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h2 className="flex items-center gap-2 font-semibold text-white">
                  <Users className="h-4 w-4 text-blue-400" />
                  Recent Leads
                </h2>
                <Link
                  href="/leads"
                  className="flex items-center gap-1 text-xs text-indigo-400 transition-colors hover:text-indigo-300"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/8">
                {recentLeadsList.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <p className="text-sm text-slate-500">No leads yet</p>
                  </div>
                ) : (
                  recentLeadsList.map((lead) => {
                    const services = (() => {
                      try {
                        return (JSON.parse(lead.serviceInterest) as string[]).join(", ")
                      } catch {
                        return lead.serviceInterest
                      }
                    })()
                    return (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-white/[0.04]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {lead.customerName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {lead.customerCompany ? `${lead.customerCompany} · ` : ""}
                            {services}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <StatusBadge status={lead.status} />
                          <Link
                            href={`/leads/${lead.id}`}
                            className="text-slate-400 transition-colors hover:text-white"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
