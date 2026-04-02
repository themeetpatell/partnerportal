"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react"
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
  const [showPassword, setShowPassword] = useState(false)

  function formatAuthError(value: unknown) {
    if (!(value instanceof Error)) {
      return "Unable to sign in right now."
    }

    const message = value.message.trim()
    const normalized = message.toLowerCase()

    if (normalized.includes("invalid login credentials")) {
      return "Invalid email or password."
    }

    if (normalized.includes("email not confirmed")) {
      return "This email is not confirmed yet. Verify the account first."
    }

    if (
      normalized.includes("failed to fetch") ||
      normalized.includes("network") ||
      normalized.includes("fetch failed")
    ) {
      return "Supabase auth could not be reached. Check your network and auth configuration."
    }

    if (normalized.includes("supabase auth environment variables are required")) {
      return "Supabase auth is not configured for the admin app."
    }

    return message || "Unable to sign in right now."
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const client = getAuthBrowserClient()
      let signInError: Error | null = null

      try {
        const result = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        signInError = result.error
      } catch (authError) {
        signInError = authError instanceof Error ? authError : new Error("Unable to sign in right now.")
      }

      if (signInError) {
        setError(formatAuthError(signInError))
        setLoading(false)
        return
      }

      const accessCheck = await fetch("/api/admin/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })

      if (!accessCheck.ok) {
        await client.auth.signOut()
        throw new Error("Your account does not have access to the admin portal.")
      }

      window.location.assign(
        getRedirectTarget(searchParams.get("next"), "/dashboard"),
      )
    } catch (submitError) {
      setError(formatAuthError(submitError))
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
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-input pr-11"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition-colors hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Sign in
        </button>
      </div>
    </form>
  )
}
