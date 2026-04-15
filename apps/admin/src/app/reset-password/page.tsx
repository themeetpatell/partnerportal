"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react"
import { getAuthBrowserClient } from "@repo/auth/client"

export default function AdminResetPasswordPage() {
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
          setError("This reset link is invalid or expired. Ask an admin to send a new reset email.")
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
            : "Unable to verify your reset link. Ask an admin to send a new reset email."
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!sessionReady) {
      setError("This reset link is invalid or expired. Ask an admin to send a new reset email.")
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
      const { error: updateError } = await client.auth.updateUser({ password })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update password. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
        <div className="w-full max-w-[420px] rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
          <div className="mb-8 text-center">
            <Image
              src="/brand-mark.png"
              alt="Finanshels logo"
              width={56}
              height={56}
              className="mx-auto mb-5 h-14 w-14"
              priority
            />
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Admin Portal
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Set a new password for your Finanshels team account
            </p>
          </div>

          {success ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-5 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-300" />
              <p className="text-sm font-medium text-white">Password updated</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                Your password has been changed successfully. Sign in with your new password.
              </p>
              <Link
                href="/sign-in"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 transition-colors hover:text-indigo-200"
              >
                Continue to sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : checkingSession ? (
            <StatusCard
              title="Verifying reset link"
              description="Confirming your recovery session before you set a new password."
              footer={null}
              tone="info"
            />
          ) : sessionReady ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <PasswordField
                id="admin-rp-password"
                label="New password"
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <PasswordField
                id="admin-rp-confirm-password"
                label="Confirm new password"
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />

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
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Update password
              </button>
            </form>
          ) : (
            <StatusCard
              title="Reset link unavailable"
              description={error || "This reset link is invalid or expired. Ask an admin to send a new reset email."}
              footer={
                <Link
                  href="/sign-in"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 transition-colors hover:text-indigo-200"
                >
                  Return to sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>
              }
              tone="error"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function StatusCard({
  title,
  description,
  footer,
  tone,
}: {
  title: string
  description: string
  footer: React.ReactNode
  tone: "info" | "error"
}) {
  const borderClass = tone === "error" ? "border-rose-400/20 bg-rose-500/10" : "border-indigo-400/20 bg-indigo-500/10"
  const iconClass = tone === "error" ? "text-rose-200" : "text-indigo-300"

  return (
    <div className={`rounded-2xl border px-4 py-5 text-center ${borderClass}`}>
      {tone === "info" ? (
        <Loader2 className={`mx-auto mb-3 h-10 w-10 animate-spin ${iconClass}`} />
      ) : null}
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">{description}</p>
      {footer}
    </div>
  )
}

function PasswordField({
  id,
  label,
  ...inputProps
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          {...inputProps}
          type={showPassword ? "text" : "password"}
          className="field-input pr-11"
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
  )
}
