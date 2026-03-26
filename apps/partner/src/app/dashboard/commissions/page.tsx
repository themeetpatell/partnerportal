"use client"

import { useEffect, useState } from "react"
import { CircleDollarSign, Landmark, TimerReset, Wallet } from "lucide-react"

type Commission = {
  id: string
  amount: string
  status: string
  createdAt: string
}

const statusStyles: Record<string, string> = {
  pending: "border border-amber-300/20 bg-amber-300/10 text-amber-100",
  approved: "border border-sky-300/20 bg-sky-400/10 text-sky-100",
  processing: "border border-violet-300/20 bg-violet-400/10 text-violet-100",
  paid: "border border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
  disputed: "border border-rose-300/20 bg-rose-400/10 text-rose-100",
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/commissions")
      .then((response) => response.json())
      .then((data) => {
        setCommissions(data.commissions || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const paid = commissions
    .filter((commission) => commission.status === "paid")
    .reduce((sum, commission) => sum + Number(commission.amount), 0)
  const pending = commissions
    .filter((commission) => !["paid", "disputed"].includes(commission.status))
    .reduce((sum, commission) => sum + Number(commission.amount), 0)
  const average =
    commissions.length > 0
      ? (commissions.reduce((sum, commission) => sum + Number(commission.amount), 0) /
          commissions.length)
      : 0

  const summaryCards = [
    {
      label: "Paid earnings",
      value: `AED ${paid.toFixed(2)}`,
      icon: Wallet,
      detail: "Settled commission value",
    },
    {
      label: "Pending payout",
      value: `AED ${pending.toFixed(2)}`,
      icon: TimerReset,
      detail: "Not yet settled",
    },
    {
      label: "Average ticket",
      value: `AED ${average.toFixed(2)}`,
      icon: Landmark,
      detail: "Average commission size",
    },
    {
      label: "Total records",
      value: commissions.length.toString(),
      icon: CircleDollarSign,
      detail: "Entries in payout history",
    },
  ]

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
        <div className="eyebrow">Commission ledger</div>
        <h1 className="page-title mt-5">Commissions</h1>
        <p className="page-subtitle mt-3 max-w-2xl">
          Track payout progress with less ambiguity. This view separates what has
          already landed from what is still moving through approval and settlement.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="metric-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-[#8ce7db]">
                <card.icon className="h-5 w-5" />
              </div>
              <p className="metric-value mt-5">{card.value}</p>
              <p className="mt-2 text-sm font-semibold text-white">{card.label}</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">{card.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="table-shell">
        <div className="border-b border-white/8 px-6 py-5">
          <p className="font-heading text-xl font-semibold text-white">Payout history</p>
          <p className="mt-1 text-sm text-slate-400">
            Every commission record tied to your account, ordered by date.
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">
            Loading commission records...
          </div>
        ) : commissions.length === 0 ? (
          <div className="empty-state m-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/6 text-[#8ce7db]">
              <CircleDollarSign className="h-6 w-6" />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-white">
              No commissions yet
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
              Commission entries will appear once your leads or service requests convert into revenue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/8 text-slate-500">
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((commission) => (
                  <tr
                    key={commission.id}
                    className="border-b border-white/6 transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-6 py-4 font-medium text-white">
                      AED {Number(commission.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`status-pill ${statusStyles[commission.status] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                      >
                        {commission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(commission.createdAt).toLocaleDateString("en-AE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
