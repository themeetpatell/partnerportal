import Link from "next/link"
import { db, commissions, partners } from "@repo/db"
import { eq, sum } from "drizzle-orm"
import { DollarSign, ArrowRight, CheckCircle2, Clock, Banknote } from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    approved: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
    processing: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    paid: "bg-green-950/60 border-green-800/40 text-green-400",
    disputed: "bg-red-950/60 border-red-800/40 text-red-400",
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${map[status] ?? "bg-zinc-800 border-zinc-700 text-zinc-400"}`}
    >
      {status}
    </span>
  )
}

const tabs = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Paid", value: "paid" },
] as const

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const activeStatus = status ?? "pending"

  const [rows, pendingSum, approvedSum, paidSum] = await Promise.all([
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
      label: "Total Approved",
      value: `AED ${fmt(approvedSum[0]?.total)}`,
      icon: CheckCircle2,
      color: "text-indigo-400",
      bg: "bg-indigo-950/40 border-indigo-800/30",
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
        <p className="text-zinc-400 text-sm mt-1">
          Review, approve, and process partner commission payouts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${card.bg}`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{card.value}</p>
                <p className="text-zinc-400 text-xs mt-0.5">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const isActive = activeStatus === tab.value
          return (
            <Link
              key={tab.value}
              href={`/commissions?status=${tab.value}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium text-sm">
              No {activeStatus} commissions
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              Commissions will appear here once leads are converted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Amount (AED)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.map((commission) => (
                  <tr
                    key={commission.id}
                    className="hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-zinc-200 text-sm font-medium">
                        {commission.partnerCompanyName ?? "Unknown"}
                      </p>
                      <p className="text-zinc-500 text-xs">
                        {commission.partnerContactName ?? ""}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-300 text-sm capitalize">
                        {commission.sourceType.replace("_", " ")}
                      </span>
                      <p className="text-zinc-600 text-xs font-mono mt-0.5">
                        {commission.sourceId.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-100 text-sm font-semibold">
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
                      <span className="text-zinc-500 text-sm">
                        {new Date(commission.calculatedAt).toLocaleDateString(
                          "en-AE",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {commission.status === "pending" && (
                          <form
                            action={`/api/commissions/${commission.id}/approve`}
                            method="POST"
                          >
                            <button
                              type="submit"
                              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
                            >
                              Approve
                            </button>
                          </form>
                        )}
                        {commission.status === "approved" && (
                          <button
                            type="button"
                            className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
                          >
                            Process Payout
                          </button>
                        )}
                        <Link
                          href={`/leads/${commission.sourceId}`}
                          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          <ArrowRight className="w-3 h-3" />
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
