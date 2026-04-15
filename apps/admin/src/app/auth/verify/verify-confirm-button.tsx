"use client"

import { useState, useTransition } from "react"
import { ArrowRight, Loader2 } from "lucide-react"

export function VerifyConfirmButton({
  tokenHash,
  type,
  nextPath,
}: {
  tokenHash: string
  type: string
  nextPath: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)

    startTransition(async () => {
      try {
        const body = new URLSearchParams()
        body.set("token_hash", tokenHash)
        body.set("type", type)
        body.set("next", nextPath)

        const response = await fetch("/auth/verify/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: body.toString(),
          credentials: "same-origin",
        })

        const payload = (await response.json()) as { error?: string; redirectTo?: string }

        if (payload.redirectTo) {
          window.location.assign(payload.redirectTo)
          return
        }

        throw new Error(payload.error || "Unable to continue with password reset.")
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to continue with password reset."
        )
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-5 text-center">
        <p className="text-sm font-medium text-white">Verification required</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">
          This extra step prevents email scanners from consuming your one-time reset link before
          you do.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="primary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Continue to reset password
      </button>
    </div>
  )
}
