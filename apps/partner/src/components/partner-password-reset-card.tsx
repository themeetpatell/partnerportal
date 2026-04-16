"use client"

import { useState } from "react"
import { toast } from "sonner"
import { KeyRound, Loader2 } from "lucide-react"

export function PartnerPasswordResetCard({ email }: { email: string }) {
  const [loading, setLoading] = useState(false)

  async function handleSendResetEmail() {
    setLoading(true)

    try {
      const response = await fetch("/api/profile/reset-password", {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Unable to send reset email.")
      }

      toast.success(`Password reset email sent to ${email}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send reset email.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="surface-card rounded-[2rem] p-6 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Password</p>
          <p className="mt-1 text-sm leading-6 text-[var(--portal-text-soft)]">
            Send a reset link to {email}.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={handleSendResetEmail}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {loading ? "Sending…" : "Reset password"}
        </button>
      </div>
    </section>
  )
}
