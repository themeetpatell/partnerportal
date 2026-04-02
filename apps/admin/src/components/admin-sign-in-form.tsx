"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { getAuthBrowserClient } from "@repo/auth/client"

function getRedirectTarget(candidate: string | null, fallback: string) {
  if (!candidate || !candidate.startsWith("/")) {
    return fallback
  }

  return candidate
}

export function AdminSignInForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const client = getAuthBrowserClient()
      const { error: signInError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        throw signInError
      }

      window.location.assign(
        getRedirectTarget(searchParams.get("next"), "/dashboard"),
      )
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in right now.",
      )
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[420px] rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)]"
    >
      <div className="space-y-5">
        <div>
          <label className="field-label">Team email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field-input mt-2"
            placeholder="team@finanshels.com"
            required
          />
        </div>

        <div>
          <label className="field-label">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field-input mt-2"
            placeholder="Enter your password"
            required
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="primary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Sign in
        </button>
      </div>
    </form>
  )
}
