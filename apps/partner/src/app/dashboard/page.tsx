import { currentUser } from "@clerk/nextjs/server"
import { db, partners, leads, commissions } from "@repo/db"
import { eq, count, sum } from "drizzle-orm"
import Link from "next/link"
import { Users, DollarSign, TrendingUp, Plus, ArrowRight, Wrench, FileText } from "lucide-react"

export default async function DashboardPage() {
  const user = await currentUser()
  const firstName = user?.firstName || "Partner"

  let totalLeads = 0
  let activeLeads = 0
  let totalEarned = 0
  let pendingPayout = 0

  if (user) {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.clerkUserId, user.id))
      .limit(1)

    if (partner) {
      const [leadsTotal, leadsActive, earnedResult, pendingResult] = await Promise.all([
        db.select({ count: count() }).from(leads).where(eq(leads.partnerId, partner.id)),
        db
          .select({ count: count() })
          .from(leads)
          .where(eq(leads.partnerId, partner.id)),
        db
          .select({ total: sum(commissions.amount) })
          .from(commissions)
          .where(eq(commissions.partnerId, partner.id)),
        db
          .select({ total: sum(commissions.amount) })
          .from(commissions)
          .where(eq(commissions.partnerId, partner.id)),
      ])

      totalLeads = leadsTotal[0]?.count ?? 0
      activeLeads = leadsActive[0]?.count ?? 0
      totalEarned = Number(earnedResult[0]?.total ?? 0)
      pendingPayout = Number(pendingResult[0]?.total ?? 0)
    }
  }

  const kpiCards = [
    {
      label: "Total Leads",
      value: String(totalLeads),
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-950/40 border-blue-800/30",
      href: "/dashboard/leads",
    },
    {
      label: "Active Leads",
      value: String(activeLeads),
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-950/40 border-purple-800/30",
      href: "/dashboard/leads",
    },
    {
      label: "Total Earned",
      value: `AED ${totalEarned.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-green-400",
      bg: "bg-green-950/40 border-green-800/30",
      href: "/dashboard/commissions",
    },
    {
      label: "Pending Payout",
      value: `AED ${pendingPayout.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "text-yellow-400",
      bg: "bg-yellow-950/40 border-yellow-800/30",
      href: "/dashboard/commissions",
    },
  ]

  const quickActions = [
    {
      label: "Submit a Lead",
      description: "Refer a new client to earn commissions",
      href: "/dashboard/leads/new",
      icon: Plus,
      cta: "Submit Lead",
      accent: "bg-blue-600 hover:bg-blue-700",
    },
    {
      label: "New Service Request",
      description: "Request a service for an existing client",
      href: "/dashboard/service-requests/new",
      icon: Wrench,
      cta: "Create Request",
      accent: "bg-zinc-700 hover:bg-zinc-600",
    },
    {
      label: "View Commissions",
      description: "Track your earnings and payout history",
      href: "/dashboard/commissions",
      icon: FileText,
      cta: "View Details",
      accent: "bg-zinc-700 hover:bg-zinc-600",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, {firstName}</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Here&apos;s an overview of your partner activity
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-10 h-10 rounded-lg border flex items-center justify-center ${card.bg}`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-zinc-400 text-sm font-medium mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-zinc-100 font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <div
              key={action.label}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col"
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
                <action.icon className="w-5 h-5 text-zinc-400" />
              </div>
              <p className="text-zinc-100 font-medium text-sm">{action.label}</p>
              <p className="text-zinc-500 text-xs mt-1 flex-1">{action.description}</p>
              <Link
                href={action.href}
                className={`mt-4 inline-flex items-center justify-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors ${action.accent}`}
              >
                {action.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
