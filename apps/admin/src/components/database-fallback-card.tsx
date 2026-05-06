"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"

type DatabaseFallbackCardProps = {
  eyebrow?: string
  title?: string
  message?: string
  host?: string | null
  /** Shown under the message (e.g. dev-only error text). */
  details?: string | null
  retryLabel?: string
  onRetry?: () => void
  /** When false, hides the DATABASE_URL / VPN troubleshooting line (e.g. for schema or app logic errors). */
  showConnectionTips?: boolean
}

export function DatabaseFallbackCard({
  eyebrow = "Database unavailable",
  title = "Database connection failed",
  message = "The admin UI rendered, but Postgres is either unreachable or overloaded. Check DATABASE_URL, confirm the database host resolves locally, and verify your network, VPN, or database load before retrying.",
  host,
  details,
  retryLabel = "Retry",
  onRetry,
  showConnectionTips = true,
}: DatabaseFallbackCardProps) {
  return (
    <div className="surface-card rounded-[1.75rem] border border-amber-400/20 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10">
          <AlertTriangle className="h-6 w-6 text-amber-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{message}</p>

          {details ? (
            <pre className="mt-4 max-h-40 max-w-2xl overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-400">
              {details}
            </pre>
          ) : null}

          {host ? (
            <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-slate-300">
              Failing host: <span className="font-medium text-amber-200">{host}</span>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-300 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-amber-200"
              >
                <RefreshCw className="h-4 w-4" />
                {retryLabel}
              </button>
            ) : null}
            {showConnectionTips ? (
              <p className="text-xs text-slate-500">
                Typical local causes: placeholder Supabase hostname, offline VPN, a typo in `DATABASE_URL`, or exhausted / slow database connections.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
