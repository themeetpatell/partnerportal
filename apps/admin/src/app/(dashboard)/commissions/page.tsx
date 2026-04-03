import Link from "next/link"
import { db, commissions, partners } from "@repo/db"
import { eq, sum } from "drizzle-orm"
import { DollarSign, Eye, CheckCircle2, Clock, Banknote } from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { className: string; label: string }> = {
    pending: {
      className: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
      label: "Pending",
    },
    approved: {
      className: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
      label: "Approved",
    },
    processing: {
      className: "bg-blue-950/60 border-blue-800/40 text-blue-400",
      label: "Processing",
    },
    paid: {
      className: "bg-green-950/60 border-green-800/40 text-green-400",
      label: "Paid",
    },
    disputed: {
      className: "bg-red-950/60 border-red-800/40 text-red-400",
      label: "Rejected",
    },
  }
  const config = map[status] ?? {
    className: "bg-white/6 border-white/10 text-slate-400",
    label: status,
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  )
}

const tabs = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Processing", value: "processing" },
  { label: "Paid", value: "paid" },
  { label: "Rejected", value: "disputed" },
] as const

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const activeStatus = status ?? "pending"

  const [rows, pendingSum, approvedSum, processingSum, paidSum] = await Promise.all([
    db
      .select({
        id: commissions.id,
        amount: commissions.amount,
        currency: commissions.currency,
        status: commissions.status,
        sourceType: commissions.sourceType,
        sourceId: commissions.sourceId,
        breakdown: commissions.breakdown,
        calculatedAt: commissions.calculatedAt,
        approvedAt: commissions.approvedAt,
        paidAt: commissions.paidAt,
        partnerId: commissions.partnerId,
        partnerCompanyName: partners.companyName,
        partnerContactName: partners.contactName,
      })
      .from(commissions)
      .leftJoin(partners, eq(commissions.partnerId, partners.id))
      .where(eq(commissions.status, activeStatus))
      .orderBy(commissions.calculatedAt),
    db
      .select({ total: sum(commissions.amount) })
      .from(commissions)
      .where(eq(commissions.status, "pending")),
    db
      .select({ total: sum(commissions.amount) })
      .from(commissions)
      .where(eq(commissions.status, "approved")),
    db
      .select({ total: sum(commissions.amount) })
      .from(commissions)
      .where(eq(commissions.status, "processing")),
    db
      .select({ total: sum(commissions.amount) })
      .from(commissions)
      .where(eq(commissions.status, "paid")),
  ])

  function fmt(val: string | null | undefined) {
    return Number(val ?? 0).toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const summaryCards = [
    {
      label: "Total Pending",
      value: `AED ${fmt(pendingSum[0]?.total)}`,
      icon: Clock,
      color: "text-yellow-400",
      bg: "bg-yellow-950/40 border-yellow-800/30",
    },
    {
      label: "Ready For Payout",
      value: `AED ${fmt(approvedSum[0]?.total)}`,
      icon: CheckCircle2,
      color: "text-indigo-400",
      bg: "bg-indigo-950/40 border-indigo-800/30",
    },
    {
      label: "In Payout",
      value: `AED ${fmt(processingSum[0]?.total)}`,
      icon: Banknote,
      color: "text-sky-300",
      bg: "bg-sky-950/40 border-sky-800/30",
    },
    {
      label: "Total Paid",
      value: `AED ${fmt(paidSum[0]?.total)}`,
      icon: Banknote,
      color: "text-green-400",
      bg: "bg-green-950/40 border-green-800/30",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Commissions</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review, approve, and process partner commission payouts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="surface-card rounded-2xl p-5"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${card.bg}`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{card.value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 surface-card rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const isActive = activeStatus === tab.value
          return (
            <Link
              key={tab.value}
              href={`/commissions?status=${tab.value}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/6 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="surface-card rounded-2xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-white/6 border border-white/8 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium text-sm">
              No {activeStatus} commissions
            </p>
            <p className="text-slate-600 text-xs mt-1">
              Commissions will appear here once leads are converted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amount (AED)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {rows.map((commission) => (
                  <tr
                    key={commission.id}
                    className="hover:bg-white/[0.04] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-white text-sm font-medium">
                        {commission.partnerCompanyName ?? "Unknown"}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {commission.partnerContactName ?? ""}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-300 text-sm capitalize">
                        {commission.sourceType.replace("_", " ")}
                      </span>
                      <p className="text-slate-600 text-xs font-mono mt-0.5">
                        {commission.sourceId.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white text-sm font-semibold">
                        {Number(commission.amount).toLocaleString("en-AE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={commission.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-500 text-sm">
                        {new Date(commission.calculatedAt).toLocaleDateString(
                          "en-AE",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {commission.status === "pending" && (
                          <>
                            <form
                              action={`/api/commissions/${commission.id}/reject`}
                              method="POST"
                            >
                              <button
                                type="submit"
                                className="text-xs bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-md font-medium transition-colors"
                              >
                                Reject
                              </button>
                            </form>
                            <form
                              action={`/api/commissions/${commission.id}/approve`}
                              method="POST"
                            >
                              <button
                                type="submit"
                                className="text-xs bg-indigo-400 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
                              >
                                Approve
                              </button>
                            </form>
                          </>
                        )}
                        {commission.status === "approved" && (
                          <form
                            action={`/api/commissions/${commission.id}/process`}
                            method="POST"
                          >
                            <button
                              type="submit"
                              className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
                            >
                              Start Payout
                            </button>
                          </form>
                        )}
                        {commission.status === "processing" && (
                          <form
                            action={`/api/commissions/${commission.id}/paid`}
                            method="POST"
                          >
                            <button
                              type="submit"
                              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
                            >
                              Mark as Paid
                            </button>
                          </form>
                        )}
                        <Link
                          href={`/leads/${commission.sourceId}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-slate-400 transition-colors hover:border-white/20 hover:text-white"
                          aria-label="View lead details"
                          title="View lead details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
