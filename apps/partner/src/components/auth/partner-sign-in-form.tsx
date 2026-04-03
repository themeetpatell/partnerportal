"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react"
import { getAuthBrowserClient } from "@repo/auth/client"
import { buildAuthContinueHref } from "@/lib/auth-continue"

export function PartnerSignInForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const client = getAuthBrowserClient()
      const { error: signInError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) throw signInError
      window.location.assign(buildAuthContinueHref(searchParams.get("next")))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in right now.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthField
        id="si-email"
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <AuthField
        id="si-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <SubmitButton loading={loading} label="Sign in" />
    </form>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function AuthField({
  id,
  label,
  ...inputProps
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  const isPasswordField = inputProps.type === "password"
  const [showPassword, setShowPassword] = useState(false)
  const resolvedType = isPasswordField && showPassword ? "text" : inputProps.type

  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-zinc-400 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          {...inputProps}
          type={resolvedType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            display: "block",
            width: "100%",
            height: "46px",
            padding: isPasswordField ? "0 48px 0 14px" : "0 14px",
            borderRadius: "10px",
            border: focused ? "1px solid rgba(129,140,248,0.55)" : "1px solid rgba(255,255,255,0.08)",
            background: focused ? "rgba(129,140,248,0.06)" : "rgba(255,255,255,0.04)",
            color: "#f4f4f5",
            fontSize: "14px",
            outline: "none",
            boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
            transition: "border-color 150ms, box-shadow 150ms, background 150ms",
          }}
        />
        {isPasswordField ? (
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500 transition-colors hover:text-white"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm text-rose-300"
      style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.16)" }}
    >
      {children}
    </div>
  )
}

export function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        height: "46px",
        borderRadius: "10px",
        background: "linear-gradient(135deg,#818cf8 0%,#6366f1 55%,#4f46e5 100%)",
        boxShadow: "0 4px 18px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
        marginTop: "8px",
      }}
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 6px 28px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.12)" }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 18px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.12)" }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
      {label}
    </button>
  )
}
