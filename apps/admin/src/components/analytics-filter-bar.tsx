"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useState, useTransition } from "react"
import { Calendar, ChevronDown, X, Bookmark, Share2 } from "lucide-react"

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this_week" },
  { label: "Last Week", value: "last_week" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "Last Quarter", value: "last_quarter" },
  { label: "This Year", value: "this_year" },
  { label: "All Time", value: "all" },
] as const

interface FilterBarProps {
  partners: { id: string; companyName: string }[]
  teamMembers: { id: string; name: string; clerkUserId: string }[]
  currentFilters: {
    dateRange?: string
    partnerId?: string
    teamMemberId?: string
    leadStatus?: string
    leadSource?: string
    serviceStatus?: string
    invoiceStatus?: string
    region?: string
    channel?: string
    currency?: string
  }
  savedFilters?: { id: string; name: string; filters: string }[]
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 appearance-none bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg pl-3 pr-7 focus:outline-none focus:border-indigo-500 cursor-pointer hover:border-zinc-600 transition-colors"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
    </div>
  )
}

export function AnalyticsFilterBar({
  partners,
  teamMembers,
  currentFilters,
  savedFilters = [],
}: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState("")

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.replace(pathname)
    })
  }, [router, pathname])

  const shareLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
  }, [])

  const activeCount = Object.values(currentFilters).filter(
    (v) => v && v !== "all"
  ).length

  const activeDateLabel =
    DATE_PRESETS.find((p) => p.value === (currentFilters.dateRange ?? "all"))
      ?.label ?? "All Time"

  return (
    <div className="space-y-3">
      {/* Saved filter views */}
      {savedFilters.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {savedFilters.map((sf) => (
            <button
              key={sf.id}
              onClick={() => {
                try {
                  const f = JSON.parse(sf.filters) as Record<string, string>
                  const params = new URLSearchParams(f)
                  startTransition(() => router.replace(`${pathname}?${params}`))
                } catch {}
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:border-indigo-600 hover:text-indigo-300 transition-colors"
            >
              <Bookmark className="w-3 h-3" />
              {sf.name}
            </button>
          ))}
        </div>
      )}

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date range presets */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {DATE_PRESETS.slice(0, 6).map((p) => {
            const active =
              (currentFilters.dateRange ?? "all") === p.value ||
              (!currentFilters.dateRange && p.value === "all")
            return (
              <button
                key={p.value}
                onClick={() => update("dateRange", p.value === "all" ? "" : p.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {p.label}
              </button>
            )
          })}
          {/* More dates */}
          <Select
            label="More…"
            value={
              DATE_PRESETS.slice(6).some(
                (p) => p.value === currentFilters.dateRange
              )
                ? currentFilters.dateRange ?? ""
                : ""
            }
            onChange={(v) => update("dateRange", v)}
            options={DATE_PRESETS.slice(6).map((p) => ({
              label: p.label,
              value: p.value,
            }))}
          />
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-zinc-800" />

        {/* Partner filter */}
        <Select
          label="All Partners"
          value={currentFilters.partnerId ?? ""}
          onChange={(v) => update("partnerId", v)}
          options={partners.map((p) => ({
            label: p.companyName,
            value: p.id,
          }))}
        />

        {/* Team member filter */}
        <Select
          label="All Team"
          value={currentFilters.teamMemberId ?? ""}
          onChange={(v) => update("teamMemberId", v)}
          options={teamMembers.map((m) => ({
            label: m.name,
            value: m.clerkUserId,
          }))}
        />

        {/* Lead status */}
        <Select
          label="Lead Status"
          value={currentFilters.leadStatus ?? ""}
          onChange={(v) => update("leadStatus", v)}
          options={[
            { label: "Submitted", value: "submitted" },
            { label: "In Review", value: "in_review" },
            { label: "Qualified", value: "qualified" },
            { label: "Proposal Sent", value: "proposal_sent" },
            { label: "Converted", value: "converted" },
            { label: "Rejected", value: "rejected" },
          ]}
        />

        {/* Lead source / channel */}
        <Select
          label="Channel"
          value={currentFilters.channel ?? ""}
          onChange={(v) => update("channel", v)}
          options={[
            { label: "Manual", value: "manual" },
            { label: "Website", value: "website" },
            { label: "Referral", value: "referral" },
            { label: "Campaign", value: "campaign" },
          ]}
        />

        {/* Service status */}
        <Select
          label="Service Status"
          value={currentFilters.serviceStatus ?? ""}
          onChange={(v) => update("serviceStatus", v)}
          options={[
            { label: "Pending", value: "pending" },
            { label: "In Progress", value: "in_progress" },
            { label: "Completed", value: "completed" },
            { label: "Cancelled", value: "cancelled" },
          ]}
        />

        {/* Invoice status */}
        <Select
          label="Invoice Status"
          value={currentFilters.invoiceStatus ?? ""}
          onChange={(v) => update("invoiceStatus", v)}
          options={[
            { label: "Draft", value: "draft" },
            { label: "Sent", value: "sent" },
            { label: "Paid", value: "paid" },
            { label: "Overdue", value: "overdue" },
            { label: "Cancelled", value: "cancelled" },
          ]}
        />

        {/* Region */}
        <Select
          label="Region"
          value={currentFilters.region ?? ""}
          onChange={(v) => update("region", v)}
          options={[
            { label: "UAE", value: "UAE" },
            { label: "KSA", value: "KSA" },
            { label: "GCC Other", value: "GCC" },
            { label: "International", value: "International" },
          ]}
        />

        {/* Currency */}
        <Select
          label="Currency"
          value={currentFilters.currency ?? ""}
          onChange={(v) => update("currency", v)}
          options={[
            { label: "AED", value: "AED" },
            { label: "USD", value: "USD" },
            { label: "EUR", value: "EUR" },
          ]}
        />

        {/* Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear ({activeCount})
            </button>
          )}
          <button
            onClick={shareLink}
            title="Copy shareable link"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <Share2 className="w-3 h-3" />
            Share
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <Bookmark className="w-3 h-3" />
            Save view
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {currentFilters.dateRange && currentFilters.dateRange !== "all" && (
            <FilterChip
              label={`Date: ${activeDateLabel}`}
              onRemove={() => update("dateRange", "")}
            />
          )}
          {currentFilters.partnerId && (
            <FilterChip
              label={`Partner: ${partners.find((p) => p.id === currentFilters.partnerId)?.companyName ?? currentFilters.partnerId}`}
              onRemove={() => update("partnerId", "")}
            />
          )}
          {currentFilters.teamMemberId && (
            <FilterChip
              label={`Team: ${teamMembers.find((m) => m.clerkUserId === currentFilters.teamMemberId)?.name ?? currentFilters.teamMemberId}`}
              onRemove={() => update("teamMemberId", "")}
            />
          )}
          {currentFilters.leadStatus && (
            <FilterChip
              label={`Lead: ${currentFilters.leadStatus.replace("_", " ")}`}
              onRemove={() => update("leadStatus", "")}
            />
          )}
          {currentFilters.channel && (
            <FilterChip
              label={`Channel: ${currentFilters.channel}`}
              onRemove={() => update("channel", "")}
            />
          )}
          {currentFilters.serviceStatus && (
            <FilterChip
              label={`Service: ${currentFilters.serviceStatus.replace("_", " ")}`}
              onRemove={() => update("serviceStatus", "")}
            />
          )}
          {currentFilters.invoiceStatus && (
            <FilterChip
              label={`Invoice: ${currentFilters.invoiceStatus}`}
              onRemove={() => update("invoiceStatus", "")}
            />
          )}
          {currentFilters.region && (
            <FilterChip
              label={`Region: ${currentFilters.region}`}
              onRemove={() => update("region", "")}
            />
          )}
          {currentFilters.currency && (
            <FilterChip
              label={`Currency: ${currentFilters.currency}`}
              onRemove={() => update("currency", "")}
            />
          )}
        </div>
      )}

      {/* Save view modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-80 space-y-4">
            <h3 className="text-zinc-100 font-semibold text-sm">Save filter view</h3>
            <input
              autoFocus
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="View name…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!saveName.trim()) return
                  await fetch("/api/admin/saved-filters", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: saveName.trim(),
                      context: "analytics",
                      filters: searchParams.toString()
                        ? Object.fromEntries(searchParams.entries())
                        : {},
                    }),
                  })
                  setShowSaveModal(false)
                  setSaveName("")
                  router.refresh()
                }}
                className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-xs">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  )
}
