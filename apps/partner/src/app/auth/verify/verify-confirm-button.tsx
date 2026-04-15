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
    <div className="space-y-4">
      <div
        className="rounded-2xl p-7 text-center"
        style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.16)" }}
      >
        <p className="mb-1 text-sm font-medium text-foreground">Verification required</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Confirm this action to continue to your password reset screen.
        </p>
      </div>

      {error ? (
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.16)",
            color: "rgb(254 202 202)",
          }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-foreground transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-70"
        style={{
          height: "46px",
          borderRadius: "10px",
          background: "linear-gradient(135deg,#818cf8 0%,#6366f1 55%,#4f46e5 100%)",
          boxShadow: "0 4px 18px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
          marginTop: "8px",
        }}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Continue to reset password
      </button>
    </div>
  )
}
