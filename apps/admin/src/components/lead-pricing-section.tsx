"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ExternalLink, FileSpreadsheet, Loader2 } from "lucide-react"

type QuoteRow = {
  id: string
  engineQuoteId: string
  engineQuoteNumber: string | null
  proposalStatus: string | null
  totalDisplay: string | null
  currency: string | null
  expiresAt: Date | string | null
  deepLinkUrl: string | null
  proposalViewUrl: string | null
  pdfUrl: string | null
  stripePaymentStatus: string | null
  engagementLetterStatus: string | null
  onboardingPushedAt: Date | string | null
  lastSyncedAt: Date | string
  syncStatus: string
}

export function CreatePricingQuoteButton({
  leadId,
  disabled,
}: {
  leadId: string
  disabled?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/pricing-quotes`, { method: "POST" })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setErr(data.error ?? "Could not create proposal draft.")
        return
      }
      router.refresh()
    } catch {
      setErr("Network error. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void run()}
        disabled={disabled || busy}
        className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
        {busy ? "Creating…" : "Create proposal draft"}
      </button>
      {err ? <p className="text-xs text-rose-400">{err}</p> : null}
    </div>
  )
}

function formatWhen(d: Date | string | null | undefined) {
  if (d == null) return "—"
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return "—"
  return dt.toLocaleString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AdminLeadPricingSection({
  leadId,
  quotes,
  canCreate,
  integrationsEnabled,
}: {
  leadId: string
  quotes: QuoteRow[]
  canCreate: boolean
  integrationsEnabled: boolean
}) {
  const openUrl = (q: QuoteRow) => q.deepLinkUrl ?? q.proposalViewUrl ?? q.pdfUrl

  return (
    <section className="surface-card rounded-2xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-white font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-slate-400" />
            Quotes &amp; proposals
          </h2>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            Linked to the external pricing engine. Drafts are created here; send and pay in the engine UI.
            Webhooks keep this list and pipeline in sync.
          </p>
        </div>
        {canCreate && integrationsEnabled ? (
          <CreatePricingQuoteButton leadId={leadId} />
        ) : null}
      </div>

      {!integrationsEnabled ? (
        <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-200">
          Pricing engine env vars are not set on this deployment — configure{" "}
          <code className="text-amber-100/90">PRICING_ENGINE_BASE_URL</code> and{" "}
          <code className="text-amber-100/90">PRICING_ENGINE_API_KEY</code> to enable creation.
        </p>
      ) : null}

      {quotes.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No linked quotes yet{integrationsEnabled ? ". Create a draft to open the pricing engine for this lead." : ""}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {quotes.map((q) => {
            const href = openUrl(q)
            return (
              <div
                key={q.id}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {q.engineQuoteNumber ?? q.engineQuoteId}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {[q.proposalStatus, q.totalDisplay, q.currency]
                        .filter((x) => x != null && String(x).trim() !== "")
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
                <dl className="mt-3 grid gap-2 text-[11px] text-slate-500 sm:grid-cols-2">
                  <div>
                    <dt className="uppercase tracking-wider">Expires</dt>
                    <dd className="text-slate-400">{formatWhen(q.expiresAt)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wider">Last synced</dt>
                    <dd className="text-slate-400">{formatWhen(q.lastSyncedAt)}</dd>
                  </div>
                  {q.stripePaymentStatus ? (
                    <div>
                      <dt className="uppercase tracking-wider">Payment</dt>
                      <dd className="text-slate-400">{q.stripePaymentStatus}</dd>
                    </div>
                  ) : null}
                  {q.engagementLetterStatus ? (
                    <div>
                      <dt className="uppercase tracking-wider">Engagement letter</dt>
                      <dd className="text-slate-400">{q.engagementLetterStatus}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
