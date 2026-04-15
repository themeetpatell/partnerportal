"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { getAuthBrowserClient } from "@repo/auth/client"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [checkingSession, setCheckingSession] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true

    async function prepareRecoverySession() {
      try {
        const client = getAuthBrowserClient()
        const { data, error: sessionError } = await client.auth.getSession()

        if (!active) {
          return
        }

        if (sessionError) {
          throw sessionError
        }

        if (!data.session) {
          setError("This reset link is invalid or expired. Request a new password reset email.")
          setSessionReady(false)
          return
        }

        setSessionReady(true)
      } catch (sessionError) {
        if (!active) {
          return
        }

        setError(
          sessionError instanceof Error
            ? sessionError.message
            : "Unable to verify your reset link. Request a new password reset email."
        )
        setSessionReady(false)
      } finally {
        if (active) {
          setCheckingSession(false)
        }
      }
    }

    void prepareRecoverySession()

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!sessionReady) {
      setError("This reset link is invalid or expired. Request a new password reset email.")
      return
    }

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
      const { error: updateError } = await client.auth.updateUser({
        password,
      })

      if (updateError) throw updateError
      setSuccess(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update password. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-10 flex items-center gap-3">
          <Image
            src="/brand-mark.png"
            alt="Finanshels logo"
            width={36}
            height={36}
            className="h-9 w-9"
            priority
          />
          <div>
            <p className="text-foreground font-bold text-sm tracking-tight">Finanshels</p>
            <p className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.28em]">Partner Portal</p>
          </div>
        </div>

        {success ? (
          <div
            className="rounded-2xl p-7 text-center"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.16)" }}
          >
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
            <p className="mb-1 text-sm font-medium text-foreground">Password updated</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your password has been changed successfully. Sign in with your new password.
            </p>
            <Link
              href="/sign-in"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary"
            >
              Continue to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2
              className="mb-1.5 text-foreground font-extrabold leading-tight tracking-[-0.04em]"
              style={{ fontSize: "1.875rem" }}
            >
              Set a new password
            </h2>
            <p className="mb-8 text-sm text-muted-foreground">
              Choose a strong password for your partner account.
            </p>

            {checkingSession ? (
              <StatusCard
                title="Verifying reset link"
                description="Confirming your recovery session before you set a new password."
                tone="info"
                icon={<Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-indigo-300" />}
              />
            ) : sessionReady ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <PasswordField
                  id="rp-pw"
                  label="New password"
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <PasswordField
                  id="rp-cpw"
                  label="Confirm new password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                {error && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm text-rose-300"
                    style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.16)" }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-foreground transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    height: "46px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg,#818cf8 0%,#6366f1 55%,#4f46e5 100%)",
                    boxShadow: "0 4px 18px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
                    marginTop: "8px",
                  }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Update password
                </button>
              </form>
            ) : (
              <StatusCard
                title="Reset link unavailable"
                description={error || "This reset link is invalid or expired. Request a new password reset email."}
                tone="error"
                footer={
                  <Link
                    href="/forgot-password"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary"
                  >
                    Request a new reset link
                  </Link>
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatusCard({
  title,
  description,
  tone,
  icon,
  footer,
}: {
  title: string
  description: string
  tone: "info" | "error"
  icon?: React.ReactNode
  footer?: React.ReactNode
}) {
  const style =
    tone === "error"
      ? { background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.16)" }
      : { background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.16)" }

  return (
    <div className="rounded-2xl p-7 text-center" style={style}>
      {icon}
      <p className="mb-1 text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      {footer}
    </div>
  )
}

function PasswordField({
  id,
  label,
  ...inputProps
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const resolvedType = showPassword ? "text" : "password"

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-muted-foreground">
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
            padding: "0 48px 0 14px",
            borderRadius: "10px",
            border: focused ? "1px solid rgba(129,140,248,0.55)" : "1px solid var(--portal-line)",
            background: focused ? "rgba(129,140,248,0.06)" : "var(--portal-surface-soft)",
            color: "var(--portal-fg)",
            fontSize: "14px",
            outline: "none",
            boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
            transition: "border-color 150ms, box-shadow 150ms, background 150ms",
          }}
        />
        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
