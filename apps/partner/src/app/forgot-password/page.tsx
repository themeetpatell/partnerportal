"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, ArrowRight, CheckCircle2, ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Something went wrong. Please try again.")
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset email.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080810] px-5 py-10">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
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
            <p className="text-white font-bold text-sm tracking-tight">Finanshels</p>
            <p className="text-[9px] text-zinc-600 uppercase tracking-[0.28em]">Partner Portal</p>
          </div>
        </div>

        {sent ? (
          <div
            className="rounded-2xl p-7 text-center"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.16)" }}
          >
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-white mb-1">Check your inbox</p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              If an account exists for <strong className="text-zinc-300">{email}</strong>, we&apos;ve sent
              a password reset link. Check your spam folder if you don&apos;t see it.
            </p>
            <Link
              href="/sign-in"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300 transition-colors hover:text-indigo-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2
              className="text-white font-extrabold tracking-[-0.04em] leading-tight mb-1.5"
              style={{ fontSize: "1.875rem" }}
            >
              Reset your password
            </h2>
            <p className="text-zinc-500 text-sm mb-8">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fp-email" className="block text-[13px] font-medium text-zinc-400 mb-2">
                  Email address
                </label>
                <input
                  id="fp-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    display: "block",
                    width: "100%",
                    height: "46px",
                    padding: "0 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#f4f4f5",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

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
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  height: "46px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg,#818cf8 0%,#6366f1 55%,#4f46e5 100%)",
                  boxShadow: "0 4px 18px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
                  marginTop: "8px",
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Send reset link
              </button>
            </form>

            <div
              className="mt-8 pt-6 text-center"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
