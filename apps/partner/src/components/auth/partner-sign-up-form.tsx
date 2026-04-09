"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Loader2, CheckCircle2, ArrowRight, Eye, EyeOff, Mail, RefreshCw } from "lucide-react"
import { getAuthBrowserClient } from "@repo/auth/client"
import { buildAuthContinueHref } from "@/lib/auth-continue"

type PartnerType = "referral" | "channel"
type FormStep = "credentials" | "otp" | "success"

export function PartnerSignUpForm({
  selectedType,
}: {
  selectedType: PartnerType
}) {
  const [step, setStep] = useState<FormStep>("credentials")

  // Credentials state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // OTP state
  const [challenge, setChallenge] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpError, setOtpError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Shared state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // ── Step 1: Create account + send OTP ──
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

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
      const { error: signUpError } = await client.auth.signUp({
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

      if (signUpError) {
        const msg = signUpError.message.toLowerCase()
        const isEmailError = msg.includes("email") || msg.includes("smtp") || msg.includes("mail")
        if (!isEmailError) {
          throw signUpError
        }
      }

      // Send OTP
      const otpRes = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const otpData = await otpRes.json()

      if (!otpRes.ok || !otpData.challenge) {
        throw new Error(otpData.error || "Failed to send verification code")
      }

      setChallenge(otpData.challenge)
      setResendCooldown(60)
      setStep("otp")
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account right now.")
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP ──
  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setOtpError(null)

    if (otpCode.length !== 6) {
      setOtpError("Please enter the 6-digit code.")
      return
    }

    setLoading(true)
    try {
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpCode, challenge }),
      })
      const verifyData = await verifyRes.json()

      if (!verifyRes.ok) {
        if (verifyData.reason === "expired") {
          setOtpError("Code has expired. Please request a new one.")
        } else {
          setOtpError(verifyData.error || "Incorrect code. Please try again.")
        }
        setLoading(false)
        return
      }

      // Auto sign-in then clear password from memory
      const client = getAuthBrowserClient()
      const { error: signInError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setPassword("")
      setConfirmPassword("")

      if (!signInError) {
        window.location.assign(buildAuthContinueHref())
        return
      }

      // Fallback: show success and let them sign in manually
      setSuccess("Account verified. Sign in to complete your partner onboarding.")
      setStep("success")
      setLoading(false)
    } catch {
      setOtpError("Verification failed. Please try again.")
      setLoading(false)
    }
  }

  // ── Resend OTP ──
  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0) return
    setOtpError(null)

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok || !data.challenge) {
        setOtpError(data.error || "Failed to resend code. Try again shortly.")
        return
      }

      setChallenge(data.challenge)
      setOtpCode("")
      setResendCooldown(60)
    } catch {
      setOtpError("Failed to resend code. Try again shortly.")
    }
  }, [email, resendCooldown])

  // ── Render: Success ──
  if (step === "success" && success) {
    return (
      <div
        className="rounded-2xl p-7 text-center"
        style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.16)" }}
      >
        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-white mb-1">Email verified</p>
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

  // ── Render: OTP Input ──
  if (step === "otp") {
    return (
      <div>
        <div
          className="rounded-2xl p-7 text-center"
          style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.16)" }}
        >
          <Mail className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-white mb-1">Check your email</p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            We sent a 6-digit code to <strong className="text-zinc-300">{email}</strong>
          </p>

          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="block w-full text-center outline-none transition-all duration-150"
              style={{
                height: "56px",
                fontSize: "28px",
                fontWeight: 800,
                letterSpacing: "0.3em",
                fontFamily: "'Courier New', Courier, monospace",
                borderRadius: "12px",
                border: "1px solid rgba(129,140,248,0.3)",
                background: "rgba(129,140,248,0.06)",
                color: "#a5b4fc",
              }}
            />

            {otpError && (
              <div
                className="rounded-xl px-4 py-3 text-sm text-rose-300"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.16)" }}
              >
                {otpError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                height: "46px",
                borderRadius: "10px",
                background: "linear-gradient(135deg,#818cf8 0%,#6366f1 55%,#4f46e5 100%)",
                boxShadow: "0 4px 18px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Verify code
            </button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0}
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: resendCooldown > 0 ? "#71717a" : "#818cf8" }}
            >
              <RefreshCw className="h-3 w-3" />
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("credentials")
                setOtpCode("")
                setOtpError(null)
                setChallenge("")
              }}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Credentials Form ──
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
