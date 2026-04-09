import { db, commissions, leads, payoutRequests } from "@repo/db"
import { and, desc, eq, inArray } from "drizzle-orm"
import Link from "next/link"
import { ArrowUpRight, CircleDollarSign, TrendingUp, Wallet } from "lucide-react"
import { CommissionFilters } from "@/components/commission-filters"
import { DatabaseFallbackCard } from "@/components/database-fallback-card"
import { getDatabaseErrorHost, isDatabaseConnectivityError } from "@/lib/database-error"
import { getCurrentPartnerRecord } from "@/lib/partner-record"

// Partner-facing status labels and styles
const statusConfig: Record<string, { label: string; style: string; hint: string }> = {
  pending: {
    label: "Calculating",
    style: "border border-zinc-400/20 bg-zinc-400/10 text-zinc-300",
    hint: "We are verifying the deal and calculating your commission amount.",
  },
  approved: {
    label: "Approved",
    style: "border border-sky-400/20 bg-sky-500/10 text-sky-200",
    hint: "Confirmed and queued for the next payout cycle.",
  },
  processing: {
    label: "Paying out",
    style: "border border-amber-400/20 bg-amber-500/10 text-amber-200",
    hint: "Payment is being transferred to your account.",
  },
  paid: {
    label: "Paid",
    style: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    hint: "Commission has been settled.",
  },
  disputed: {
    label: "Under review",
    style: "border border-rose-400/20 bg-rose-500/10 text-rose-200",
    hint: "There is an issue being reviewed. Contact your partnership manager.",
  },
}

const payoutStatusConfig: Record<string, { label: string; style: string }> = {
  pending: { label: "Pending", style: "border border-zinc-400/20 bg-zinc-400/10 text-zinc-300" },
  processing: { label: "Processing", style: "border border-amber-400/20 bg-amber-500/10 text-amber-200" },
  paid: { label: "Paid", style: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200" },
  failed: { label: "Failed", style: "border border-rose-400/20 bg-rose-500/10 text-rose-200" },
}

function formatAed(value: string | number | null | undefined) {
  const n = Number(value ?? 0)
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0)
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

type Breakdown = Record<string, string | number>

function parseBreakdown(raw: string | null | undefined): Breakdown | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Breakdown
    return null
  } catch {
    return null
  }
}

function formatBreakdownLine(b: Breakdown): string | null {
  // Try to find a rate + base amount pattern
  const rate =
    b.commission_rate ?? b.rate ?? b.percentage ?? b.commissionRate ?? null
  const base =
    b.base_amount ?? b.deal_amount ?? b.source_amount ?? b.baseAmount ?? b.dealAmount ?? null

  if (rate !== null && base !== null) {
    const rateStr = String(rate).includes("%") ? String(rate) : `${rate}%`
    const baseNum = Number(base)
    if (Number.isFinite(baseNum) && baseNum > 0) {
      return `${rateStr} of ${formatAed(baseNum)}`
    }
  }

  if (rate !== null) {
    const rateStr = String(rate).includes("%") ? String(rate) : `${rate}%`
    return `Commission rate: ${rateStr}`
  }

  return null
}

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>
}) {
  const { status: filterStatus, type: filterType } = await searchParams
  const partner = await getCurrentPartnerRecord()

  type CommissionRow = typeof commissions.$inferSelect & { clientName: string | null; clientCompany: string | null; leadId: string | null }
  type PayoutRow = typeof payoutRequests.$inferSelect

  let rows: CommissionRow[] = []
  let payouts: PayoutRow[] = []

  try {
    if (partner) {
      const [commissionRows, payoutRows] = await Promise.all([
          db
            .select()
            .from(commissions)
            .where(eq(commissions.partnerId, partner.id))
            .orderBy(desc(commissions.createdAt)),
          db
            .select()
            .from(payoutRequests)
            .where(eq(payoutRequests.partnerId, partner.id))
            .orderBy(desc(payoutRequests.createdAt)),
        ])

      payouts = payoutRows

      const leadIds = [...new Set(
        commissionRows
          .filter((commission) => commission.sourceType === "lead")
          .map((commission) => commission.sourceId)
      )]

      const leadMap = new Map<string, { customerName: string; customerCompany: string | null }>()
      if (leadIds.length > 0) {
        const leadRows = await db
          .select({
            id: leads.id,
            customerName: leads.customerName,
            customerCompany: leads.customerCompany,
          })
          .from(leads)
          .where(and(eq(leads.partnerId, partner.id), inArray(leads.id, leadIds)))

        for (const lead of leadRows) {
          leadMap.set(lead.id, {
            customerName: lead.customerName,
            customerCompany: lead.customerCompany,
          })
        }
      }

      rows = commissionRows.map((commission) => {
        const leadInfo =
          commission.sourceType === "lead"
            ? (leadMap.get(commission.sourceId) ?? null)
            : null

        return {
          ...commission,
          clientName: leadInfo?.customerName ?? null,
          clientCompany: leadInfo?.customerCompany ?? null,
          leadId: commission.sourceType === "lead" ? commission.sourceId : null,
        }
      })
    }
  } catch (error) {
    if (isDatabaseConnectivityError(error)) {
      return (
        <DatabaseFallbackCard
          title="Commissions unavailable"
          message="The commissions query timed out or could not reach Postgres."
          host={getDatabaseErrorHost(error)}
        />
      )
    }
    throw error
  }

  // Partner-meaningful buckets
  // "Total earned" = everything confirmed (approved + processing + paid) — your score
  // "Awaiting payout" = approved + processing — money confirmed, on its way
  // "Paid out" = paid — already in your bank
  const totalEarned = rows
    .filter((c) => ["approved", "processing", "paid"].includes(c.status))
    .reduce((s, c) => s + Number(c.amount), 0)

  const totalAwaiting = rows
    .filter((c) => ["approved", "processing"].includes(c.status))
    .reduce((s, c) => s + Number(c.amount), 0)

  const totalPaid = rows
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount), 0)

  // Apply filters
  const filteredRows = rows.filter((c) => {
    if (filterStatus && filterStatus !== "all" && c.status !== filterStatus) return false
    if (filterType && filterType !== "all" && c.sourceType !== filterType) return false
    return true
  })

  return (
    <div className="space-y-8">
      {/* Header + metrics */}
      <section className="surface-card rounded-[2rem] px-5 py-6 sm:px-8 sm:py-7">
        <div className="eyebrow">Commission ledger</div>
        <h1 className="page-title mt-5">Commissions</h1>
        <p className="page-subtitle mt-3 max-w-2xl">
          Every commission you have earned, with transparent status on where each one sits in the approval and payment pipeline.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="metric-card">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-200">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="metric-value mt-5">{formatAed(totalEarned)}</p>
            <p className="mt-2 text-sm font-semibold text-white">Total earned</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              All confirmed commissions across your leads.
            </p>
          </div>
          <div className="metric-card">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-200">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <p className="metric-value mt-5">{formatAed(totalAwaiting)}</p>
            <p className="mt-2 text-sm font-semibold text-white">Awaiting payout</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Approved by Finanshels — transfer in progress.
            </p>
          </div>
          <div className="metric-card">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-200">
              <Wallet className="h-5 w-5" />
            </div>
            <p className="metric-value mt-5">{formatAed(totalPaid)}</p>
            <p className="mt-2 text-sm font-semibold text-white">Paid out</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Settled and transferred to your account.
            </p>
          </div>
        </div>
      </section>

      {/* Commission records */}
      <section className="table-shell">
        <div className="flex flex-col gap-4 border-b border-white/8 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-heading text-xl font-semibold text-white">Commission records</p>
            <p className="mt-1 text-sm text-slate-400">
              Each entry tied to a specific lead or service request, sorted by most recent.
            </p>
          </div>
          <CommissionFilters
            status={filterStatus ?? "all"}
            type={filterType ?? "all"}
          />
        </div>

        {filteredRows.length === 0 ? (
          <div className="empty-state m-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/12 text-indigo-200">
              <CircleDollarSign className="h-6 w-6" />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-white">
              {rows.length === 0 ? "No commissions yet" : "No matching records"}
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
              {rows.length === 0
                ? "Commission entries appear once your leads convert into won deals and are reviewed by Finanshels."
                : "Try a different status or type filter."}
            </p>
            {rows.length === 0 ? (
              <Link href="/dashboard/leads" className="primary-button mt-6">
                View your leads
              </Link>
            ) : (
              <Link href="/dashboard/commissions" className="secondary-button mt-6">
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-slate-500">
                    <th className="px-6 py-4 font-medium">Client</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Earned on</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((c) => {
                    const status = statusConfig[c.status] ?? { label: c.status, style: "border border-white/10 bg-white/[0.05] text-slate-300", hint: "" }
                    const breakdown = parseBreakdown(c.breakdown)
                    return (
                      <tr key={c.id} className="border-b border-white/6 transition-colors hover:bg-white/[0.03]">
                        <td className="px-6 py-4">
                          {c.leadId ? (
                            <Link href={`/dashboard/leads/${c.leadId}`} className="group flex items-start gap-2">
                              <div>
                                <p className="font-medium text-white group-hover:text-indigo-200">
                                  {c.clientName ?? "Unknown client"}
                                </p>
                                {c.clientCompany ? (
                                  <p className="mt-0.5 text-xs text-slate-400">{c.clientCompany}</p>
                                ) : null}
                              </div>
                              <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-indigo-400" />
                            </Link>
                          ) : (
                            <div>
                              <p className="font-medium text-white">Service request</p>
                              <p className="mt-0.5 text-xs text-slate-500">Not linked to a lead</p>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="status-pill border border-white/10 bg-white/[0.05] text-slate-300">
                            {c.sourceType === "lead" ? "Lead" : "Service req."}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-white">{formatAed(c.amount)}</p>
                          {breakdown && formatBreakdownLine(breakdown) ? (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatBreakdownLine(breakdown)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`status-pill ${status.style}`}>{status.label}</span>
                          {status.hint ? (
                            <p className="mt-1.5 max-w-[180px] text-xs leading-5 text-slate-500">{status.hint}</p>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          <p>{formatDate(c.calculatedAt)}</p>
                          {c.paidAt ? (
                            <p className="mt-0.5 text-xs text-emerald-400">Paid {formatDate(c.paidAt)}</p>
                          ) : c.approvedAt ? (
                            <p className="mt-0.5 text-xs text-sky-400">Approved {formatDate(c.approvedAt)}</p>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="grid gap-4 p-4 md:hidden">
              {filteredRows.map((c) => {
                const status = statusConfig[c.status] ?? { label: c.status, style: "border border-white/10 bg-white/[0.05] text-slate-300", hint: "" }
                return (
                  <div key={c.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {c.leadId ? (
                          <Link href={`/dashboard/leads/${c.leadId}`} className="font-heading text-base font-semibold text-white hover:text-indigo-200">
                            {c.clientName ?? "Unknown client"}
                          </Link>
                        ) : (
                          <p className="font-heading text-base font-semibold text-white">Service request</p>
                        )}
                        {c.clientCompany ? (
                          <p className="mt-0.5 text-sm text-slate-400">{c.clientCompany}</p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-lg font-semibold text-white">{formatAed(c.amount)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`status-pill ${status.style}`}>{status.label}</span>
                      <span className="text-xs text-slate-500">{formatDate(c.calculatedAt)}</span>
                    </div>
                    {status.hint ? (
                      <p className="mt-2 text-xs leading-5 text-slate-500">{status.hint}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* Payout requests */}
      {payouts.length > 0 ? (
        <section className="table-shell">
          <div className="border-b border-white/8 px-6 py-5">
            <p className="font-heading text-xl font-semibold text-white">Payout batches</p>
            <p className="mt-1 text-sm text-slate-400">
              Batched payment transfers from Finanshels to your account.
            </p>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/8 text-slate-500">
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Requested</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const ps = payoutStatusConfig[p.status] ?? { label: p.status, style: "border border-white/10 bg-white/[0.05] text-slate-300" }
                  return (
                    <tr key={p.id} className="border-b border-white/6 hover:bg-white/[0.03]">
                      <td className="px-6 py-4 font-semibold text-white">{formatAed(p.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`status-pill ${ps.style}`}>{ps.label}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{formatDate(p.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 p-4 md:hidden">
            {payouts.map((p) => {
              const ps = payoutStatusConfig[p.status] ?? { label: p.status, style: "border border-white/10 bg-white/[0.05] text-slate-300" }
              return (
                <div key={p.id} className="flex items-center justify-between rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                  <div>
                    <p className="font-semibold text-white">{formatAed(p.amount)}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(p.createdAt)}</p>
                  </div>
                  <span className={`status-pill ${ps.style}`}>{ps.label}</span>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
