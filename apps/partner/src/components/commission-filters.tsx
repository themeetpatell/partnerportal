"use client"

import { useRouter } from "next/navigation"

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Calculating", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Paying out", value: "processing" },
  { label: "Paid", value: "paid" },
  { label: "Under review", value: "disputed" },
]

const TYPE_OPTIONS = [
  { label: "All types", value: "all" },
  { label: "Lead", value: "lead" },
  { label: "Service request", value: "service_request" },
]

export function CommissionFilters({
  status,
  type,
}: {
  status: string
  type: string
}) {
  const router = useRouter()

  function update(key: "status" | "type", value: string) {
    const params = new URLSearchParams()
    if (key === "status") {
      if (value !== "all") params.set("status", value)
      if (type !== "all") params.set("type", type)
    } else {
      if (status !== "all") params.set("status", status)
      if (value !== "all") params.set("type", value)
    }
    const qs = params.toString()
    router.push(`/dashboard/commissions${qs ? `?${qs}` : ""}`)
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <select
        value={status}
        onChange={(e) => update("status", e.target.value)}
        className="min-w-0 rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-[var(--portal-text-soft)] outline-none focus:border-primary/40 focus:bg-secondary/80 sm:min-w-[170px]"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-card text-foreground">
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={type}
        onChange={(e) => update("type", e.target.value)}
        className="min-w-0 rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-[var(--portal-text-soft)] outline-none focus:border-primary/40 focus:bg-secondary/80 sm:min-w-[170px]"
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-card text-foreground">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
