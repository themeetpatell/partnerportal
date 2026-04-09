"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"

type DatabaseFallbackCardProps = {
  title?: string
  message?: string
  host?: string | null
  retryLabel?: string
  onRetry?: () => void
}

export function DatabaseFallbackCard({
  title = "Database connection failed",
  message = "The partner UI rendered, but Postgres is either unreachable or overloaded. Check DATABASE_URL, confirm the database host resolves locally, and verify your network, VPN, or database load before retrying.",
  host,
  retryLabel = "Retry",
  onRetry,
}: DatabaseFallbackCardProps) {
  return (
    <div className="surface-card-strong rounded-[1.75rem] border border-amber-400/20 bg-amber-500/6 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10">
          <AlertTriangle className="h-6 w-6 text-amber-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">
            Database unavailable
          </p>
          <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--portal-text-soft)]">{message}</p>

          {host ? (
            <div className="mt-5 rounded-2xl border border-border bg-secondary/50 p-4 text-sm text-[var(--portal-text-soft)]">
              Failing host: <span className="font-medium text-amber-200">{host}</span>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {retryLabel}
              </button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Typical local causes: placeholder Supabase hostname, offline VPN, a typo in `DATABASE_URL`, or exhausted / slow database connections.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
