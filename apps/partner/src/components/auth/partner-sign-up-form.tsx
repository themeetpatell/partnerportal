"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { getAuthBrowserClient } from "@repo/auth/client"

export function PartnerSignUpForm() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: [firstName.trim(), lastName.trim()]
              .filter(Boolean)
              .join(" "),
          },
        },
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.session) {
        window.location.assign("/register")
        return
      }

      setSuccess(
        "Your account was created. Check your inbox to confirm your email, then sign in to continue.",
      )
      setLoading(false)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create your account right now.",
      )
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="surface-card-strong rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)]"
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">First name</label>
            <input
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="field-input mt-2"
              placeholder="Meet"
              required
            />
          </div>

          <div>
            <label className="field-label">Last name</label>
            <input
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="field-input mt-2"
              placeholder="Patel"
              required
            />
          </div>
        </div>

        <div>
          <label className="field-label">Work email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field-input mt-2"
            placeholder="you@company.com"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-input mt-2"
              placeholder="Minimum 8 characters"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="field-label">Confirm password</label>
              <Link
                href="/sign-in"
                className="text-xs font-medium text-indigo-300 transition-colors hover:text-indigo-200"
              >
                Already have an account?
              </Link>
            </div>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="field-input mt-2"
              placeholder="Repeat password"
              required
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="primary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create account
        </button>
      </div>
    </form>
  )
}
