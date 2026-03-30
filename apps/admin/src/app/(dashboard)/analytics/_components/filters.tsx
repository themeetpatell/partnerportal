"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"

const PERIODS = [
  { label: "All Time", value: "" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "Last Quarter", value: "last_quarter" },
  { label: "This Year", value: "this_year" },
]

export function AnalyticsFilters({
  partners,
}: {
  partners: { id: string; companyName: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const currentPeriod = sp.get("period") ?? ""
  const currentPartner = sp.get("partnerId") ?? ""

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, sp]
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period tabs */}
      <div className="flex gap-1 surface-card rounded-lg p-1 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => update("period", p.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              currentPeriod === p.value
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Partner filter */}
      {partners.length > 0 && (
        <select
          value={currentPartner}
          onChange={(e) => update("partnerId", e.target.value)}
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400 min-w-[180px]"
        >
          <option value="">All Partners</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.companyName}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
