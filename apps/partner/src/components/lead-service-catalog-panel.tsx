"use client"

import { Check, HelpCircle } from "lucide-react"

export type LeadCatalogRow = { name: string; code: string }

type LeadServiceCatalogPanelProps = {
  rows: LeadCatalogRow[]
  selected: string[]
  onToggle: (name: string) => void
}

export function LeadServiceCatalogPanel({ rows, selected, onToggle }: LeadServiceCatalogPanelProps) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-card text-left shadow-[0_1px_3px_var(--portal-shadow-card)]">
      <div className="px-6 pb-5 pt-6">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">Services</h2>
        <div className="mt-2 flex items-start gap-2">
          <p className="flex-1 text-sm leading-snug text-muted-foreground">
            Manage services used across all modules
          </p>
          <button
            type="button"
            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/80 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Service codes align with the Finanshels catalog for reporting and integrations."
          >
            <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border px-6 py-3 text-[13px] font-medium text-muted-foreground">
          <span>Name</span>
          <span className="text-right">Code</span>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No services available.
            </div>
          ) : (
            rows.map((row) => {
              const isSelected = selected.includes(row.name)

              return (
                <button
                  key={row.name}
                  type="button"
                  onClick={() => onToggle(row.name)}
                  className={`flex w-full items-center justify-between gap-4 border-b border-border px-6 py-[18px] text-left transition-colors last:border-b-0 ${
                    isSelected ? "bg-primary/[0.08]" : "hover:bg-secondary/60"
                  }`}
                >
                  <span className="min-w-0 flex-1 font-semibold text-foreground">{row.name}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span
                      className="max-w-[min(14rem,42vw)] truncate text-right text-sm font-normal tabular-nums text-muted-foreground"
                      title={row.code}
                    >
                      {row.code}
                    </span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    ) : (
                      <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
