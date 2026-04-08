"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, CheckCircle2, ArrowRight, Eye, EyeOff } from "lucide-react"
import { getAuthBrowserClient } from "@repo/auth/client"
import { buildAuthContinueHref } from "@/lib/auth-continue"

type PartnerType = "referral" | "channel"

export function PartnerSignUpForm({
  selectedType,
}: {
  selectedType: PartnerType
}) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const client = getAuthBrowserClient()
      const { data, error: signUpError } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" "),
            partner_type: selectedType,
          },
        },
      })

      // If signUp returned an error unrelated to email sending, throw it.
      // Email-related errors are expected when Supabase SMTP isn't configured
      // — the user is still created, we just need to confirm manually.
      if (signUpError) {
        const msg = signUpError.message.toLowerCase()
        const isEmailError = msg.includes("email") || msg.includes("smtp") || msg.includes("mail")
        if (!isEmailError) {
          throw signUpError
        }
        console.warn("[sign-up] Supabase email error (expected):", signUpError.message)
      }

      // Auto-confirm email and send welcome via SendGrid
      try {
        const confirmRes = await fetch("/api/auth/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        })
        const confirmData = await confirmRes.json().catch(() => ({}))
        console.log("[sign-up] confirm response:", confirmRes.status, confirmData)
      } catch (fetchErr) {
        console.error("[sign-up] confirm fetch failed:", fetchErr)
      }

      if (data.session) {
        window.location.assign(buildAuthContinueHref())
        return
      }

      // Sign in automatically now that email is confirmed
      const { error: signInError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (!signInError) {
        window.location.assign(buildAuthContinueHref())
        return
      }

      // Fallback: show success and let them sign in manually
      setSuccess("Account created. Sign in to complete your partner onboarding.")
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account right now.")
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div
        className="rounded-2xl p-7 text-center"
        style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.16)" }}
      >
        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-white mb-1">Check your inbox</p>
        <p className="text-sm text-zinc-400 leading-relaxed">{success}</p>
        <Link
          href="/sign-in"
          className="mt-4 inline-flex text-sm font-semibold text-indigo-300 transition-colors hover:text-indigo-200"
        >
          Continue to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <AuthField id="su-first" label="First name" type="text" autoComplete="given-name" placeholder="Meet" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <AuthField id="su-last" label="Last name" type="text" autoComplete="family-name" placeholder="Patel" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>
      <AuthField id="su-email" label="Work email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <AuthField id="su-pw" label="Password" type="password" autoComplete="new-password" placeholder="Minimum 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <AuthField id="su-cpw" label="Confirm password" type="password" autoComplete="new-password" placeholder="Repeat password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm text-rose-300"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.16)" }}>
          {error}
        </div>
      )}

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
        Create account
      </button>

      <p className="text-[11px] text-zinc-700 text-center">
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  )
}

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
