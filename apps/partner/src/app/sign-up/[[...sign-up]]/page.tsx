"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ClipboardList, FileCheck2, Handshake } from "lucide-react"
import { PartnerSignUpForm } from "@/components/auth/partner-sign-up-form"
import { useAuth } from "@repo/auth/client"

const highlights = [
  { icon: ClipboardList, label: "Structured onboarding", sub: "Create an account, then complete the registration flow" },
  { icon: FileCheck2, label: "Document-ready setup", sub: "Provide business details and required paperwork in one place" },
  { icon: Handshake, label: "Built for partner operations", sub: "Use the portal to manage the relationship after approval" },
]

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userId, isLoaded } = useAuth()
  const type = searchParams.get("type")

  useEffect(() => {
    if (type !== "referral" && type !== "channel") {
      router.replace("/register")
      return
    }

    if (isLoaded && userId) {
      router.replace("/dashboard")
    }
  }, [isLoaded, router, type, userId])

  if (type !== "referral" && type !== "channel") {
    return null
  }

  if (isLoaded && userId) {
    return null
  }

  const selectedTypeLabel = type === "channel" ? "Channel Partner" : "Referral Partner"

  return (
    <div className="min-h-screen flex bg-[#080810]">
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex w-[54%] relative overflow-hidden flex-col p-14 xl:p-16">
        {/* Background */}
        <div className="absolute inset-0 bg-[#080810]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.14) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(129,140,248,0.4) 50%, transparent 100%)" }}
        />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-base"
              style={{
                background: "linear-gradient(135deg,#818cf8 0%,#4f46e5 100%)",
                boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
              }}
            >
              F
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-tight">Finanshels</p>
              <p className="text-[9px] text-zinc-600 uppercase tracking-[0.28em]">Partner Portal</p>
            </div>
          </div>

          {/* Hero copy */}
          <div className="flex-1 flex flex-col justify-center max-w-[420px]">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit mb-8"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-[0.2em]">
                Partner account setup
              </span>
            </div>

            <h1
              className="text-white font-extrabold leading-[1.06] tracking-[-0.04em]"
              style={{ fontSize: "clamp(2rem, 3vw, 2.7rem)" }}
            >
              Start your
              <br />
              partner
              <br />
              account.
              <br />
              <span style={{ color: "#818cf8" }}>Finish inside.</span>
            </h1>

            <p className="mt-5 text-zinc-400 text-[15px] leading-[1.7]">
              This step creates your login. After that, you will complete the actual partner registration and submit the details needed for review.
            </p>

            {/* Feature highlights */}
            <div className="mt-10 space-y-3">
              {highlights.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-4">
                  <div
                    className="h-9 w-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.18)" }}
                  >
                    <Icon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{label}</p>
                    <p className="text-zinc-600 text-xs">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-14 lg:px-14"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="mb-8 flex w-full max-w-[400px] justify-end">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Already have an account? Sign in
          </Link>
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-base"
            style={{ background: "linear-gradient(135deg,#818cf8,#4f46e5)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}
          >F</div>
          <div>
            <p className="text-white font-bold text-sm tracking-tight">Finanshels</p>
            <p className="text-[9px] text-zinc-600 uppercase tracking-[0.28em]">Partner Portal</p>
          </div>
        </div>

        <div className="w-full max-w-[400px]">
          <h2
            className="text-white font-extrabold tracking-[-0.04em] leading-tight mb-1.5"
            style={{ fontSize: "1.875rem" }}
          >
            Create your account
          </h2>
          <p className="text-zinc-500 text-sm mb-8">
            {selectedTypeLabel} selected. After signup, you&apos;ll complete onboarding and wait for admin approval.
          </p>

          <div className="mb-5 rounded-2xl border border-indigo-400/18 bg-indigo-500/8 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
              Selected partner model
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{selectedTypeLabel}</p>
          </div>

          <PartnerSignUpForm selectedType={type} />

          <div
            className="mt-8 pt-8 text-center space-y-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-sm text-zinc-600">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                Sign in
              </Link>
            </p>
            <Link href="/register" className="block text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              Change partner model
            </Link>
            <Link href="/" className="block text-xs text-zinc-700 hover:text-zinc-500 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
