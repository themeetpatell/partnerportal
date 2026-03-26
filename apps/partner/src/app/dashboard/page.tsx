import { currentUser } from "@clerk/nextjs/server"
import { db, partners, leads, commissions } from "@repo/db"
import { and, count, eq, notInArray, sum } from "drizzle-orm"
import Link from "next/link"
import {
  ArrowRight,
  CircleDollarSign,
  ClipboardList,
  Plus,
  Sparkles,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react"

export default async function DashboardPage() {
  const user = await currentUser()
  const firstName = user?.firstName || "Partner"

  let totalLeads = 0
  let activeLeads = 0
  let totalEarned = 0
  let pendingPayout = 0
  let commissionRecords = 0

  if (user) {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.clerkUserId, user.id))
      .limit(1)

    if (partner) {
      const [leadsTotal, leadsActive, paidResult, pendingResult, recordCount] =
        await Promise.all([
          db.select({ count: count() }).from(leads).where(eq(leads.partnerId, partner.id)),
          db
            .select({ count: count() })
            .from(leads)
            .where(
              and(
                eq(leads.partnerId, partner.id),
                notInArray(leads.status, ["converted", "rejected"]),
              ),
            ),
          db
            .select({ total: sum(commissions.amount) })
            .from(commissions)
            .where(and(eq(commissions.partnerId, partner.id), eq(commissions.status, "paid"))),
          db
            .select({ total: sum(commissions.amount) })
            .from(commissions)
            .where(
              and(
                eq(commissions.partnerId, partner.id),
                notInArray(commissions.status, ["paid", "disputed"]),
              ),
            ),
          db
            .select({ count: count() })
            .from(commissions)
            .where(eq(commissions.partnerId, partner.id)),
        ])

      totalLeads = Number(leadsTotal[0]?.count ?? 0)
      activeLeads = Number(leadsActive[0]?.count ?? 0)
      totalEarned = Number(paidResult[0]?.total ?? 0)
      pendingPayout = Number(pendingResult[0]?.total ?? 0)
      commissionRecords = Number(recordCount[0]?.count ?? 0)
    }
  }

  const kpiCards = [
    {
      label: "Total leads",
      value: String(totalLeads),
      icon: UserPlus,
      detail: "All partner-submitted opportunities",
      accent: "text-[#8ce7db]",
      glow: "from-[#58d5c4]/18 to-transparent",
    },
    {
      label: "Active pipeline",
      value: String(activeLeads),
      icon: TrendingUp,
      detail: "Open and progressing lead count",
      accent: "text-[#f2bc74]",
      glow: "from-[#f2bc74]/16 to-transparent",
    },
    {
      label: "Paid earnings",
      value: `AED ${totalEarned.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Wallet,
      detail: "Already settled and paid out",
      accent: "text-emerald-200",
      glow: "from-emerald-400/16 to-transparent",
    },
    {
      label: "Pending payout",
      value: `AED ${pendingPayout.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: CircleDollarSign,
      detail: "Approved or processing commission value",
      accent: "text-sky-200",
      glow: "from-sky-400/16 to-transparent",
    },
  ]

  const quickActions = [
    {
      label: "Submit a lead",
      description: "Capture a new referral and hand it off with clean context.",
      href: "/dashboard/leads/new",
      icon: Plus,
      buttonLabel: "Create lead",
    },
    {
      label: "New service request",
      description: "Route an existing client into Finanshels delivery without email threads.",
      href: "/dashboard/service-requests/new",
      icon: ClipboardList,
      buttonLabel: "Create request",
    },
    {
      label: "Review payouts",
      description: "See what has been earned, approved, and is still awaiting settlement.",
      href: "/dashboard/commissions",
      icon: CircleDollarSign,
      buttonLabel: "Open commissions",
    },
  ]

  const payoutRate =
    totalEarned + pendingPayout > 0
      ? `${Math.round((totalEarned / (totalEarned + pendingPayout)) * 100)}%`
      : "0%"

  return (
    <div className="space-y-8">
      <section className="surface-card relative overflow-hidden rounded-[2rem] px-6 py-7 sm:px-8 sm:py-8">
        <div className="absolute inset-y-0 right-0 hidden w-80 bg-gradient-to-l from-[#58d5c4]/8 via-transparent to-transparent lg:block" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Performance snapshot
            </div>
            <h1 className="page-title mt-5">
              Welcome back, {firstName}.
            </h1>
            <p className="page-subtitle mt-4 max-w-2xl">
              This workspace is tuned for partner execution: submit opportunities,
              watch them progress, and keep commission visibility tight.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard/leads/new" className="primary-button">
                Submit a new lead
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard/commissions" className="secondary-button">
                View commissions
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="surface-card-soft rounded-[1.6rem] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Conversion posture
              </p>
              <p className="font-heading mt-3 text-3xl font-semibold text-white">
                {activeLeads > 0 ? "In motion" : "Ready"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {activeLeads > 0
                  ? `${activeLeads} active opportunities are moving through the pipeline.`
                  : "No open opportunities yet. Start by submitting your first lead."}
              </p>
            </div>

            <div className="surface-card-soft rounded-[1.6rem] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Settlement ratio
              </p>
              <p className="font-heading mt-3 text-3xl font-semibold text-white">
                {payoutRate}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Share of recorded commissions that have already been paid out.
              </p>
            </div>

            <div className="surface-card-soft rounded-[1.6rem] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Commission records
              </p>
              <p className="font-heading mt-3 text-3xl font-semibold text-white">
                {commissionRecords}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Historical payout entries tied to your partner account.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <Link key={card.label} href="/dashboard/commissions" className="metric-card group relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${card.glow} opacity-80`} />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/6">
                  <card.icon className={`h-5 w-5 ${card.accent}`} />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-200" />
              </div>
              <p className="metric-value mt-6">{card.value}</p>
              <p className="mt-2 text-sm font-semibold text-white">{card.label}</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">{card.detail}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card rounded-[2rem] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Quick actions
              </p>
              <h2 className="section-title mt-2">Run the next move</h2>
            </div>
            <span className="tag-pill">Partner ops</span>
          </div>

          <div className="mt-6 grid gap-4">
            {quickActions.map((action) => (
              <div
                key={action.label}
                className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-[#8ce7db]">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <Link href={action.href} className="secondary-button px-4 py-2.5">
                    {action.buttonLabel}
                  </Link>
                </div>
                <p className="font-heading mt-4 text-xl font-semibold text-white">
                  {action.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {action.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-6 sm:p-7">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
            Working style
          </p>
          <h2 className="section-title mt-2">What this portal is optimized for</h2>

          <div className="mt-6 space-y-4">
            {[
              "Shorter handoff cycles from referral to review.",
              "Cleaner commission visibility for partner trust.",
              "A more credible workspace when your team logs in every day.",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-start gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#58d5c4]/12 text-sm font-semibold text-[#8ce7db]">
                  0{index + 1}
                </div>
                <p className="pt-1 text-sm leading-6 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
