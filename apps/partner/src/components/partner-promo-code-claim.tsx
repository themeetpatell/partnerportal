"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export function PartnerPromoCodeClaim() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function claim() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch("/api/profile/partner-promo-code", {
        method: "POST",
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.")
        return
      }
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 px-4 py-3">
      <p className="text-sm text-amber-900 dark:text-amber-100/90">
        Your proposal promo code is not on file yet. Generate one to use in the pricing engine.
      </p>
      {error ? (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void claim()}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Generating…" : "Generate my promo code"}
      </button>
    </div>
  )
}
