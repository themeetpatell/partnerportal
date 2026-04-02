"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FolderKanban, BellRing, ShieldCheck } from "lucide-react"
import { PartnerSignInForm } from "@/components/auth/partner-sign-in-form"
import { useAuth } from "@repo/auth/client"

const workspacePoints = [
  {
    icon: FolderKanban,
    title: "One place for partner work",
    description: "Review leads, registration status, documents, and commissions without jumping between tools.",
    color: "#818cf8",
  },
  {
    icon: BellRing,
    title: "Clear next actions",
    description: "See what needs attention next, from onboarding steps to follow-ups and submissions.",
    color: "#34d399",
  },
  {
    icon: ShieldCheck,
    title: "Built for account access",
    description: "Sign in to continue your existing workspace instead of landing on a marketing page in disguise.",
    color: "#f59e0b",
  },
]

export default function SignInPage() {
  const router = useRouter()
  const { userId, isLoaded } = useAuth()

  useEffect(() => {
    if (isLoaded && userId) {
      router.replace("/dashboard")
    }
  }, [isLoaded, router, userId])

  if (isLoaded && userId) {
    return null
  }

  return (
    <div className="min-h-screen flex bg-[#080810]">
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex w-[54%] relative overflow-hidden flex-col p-14 xl:p-16">
        {/* Background treatment */}
        <div className="absolute inset-0 bg-[#080810]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Indigo glow — top right */}
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)",
          }}
        />
        {/* Violet glow — bottom left */}
        <div
          className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%)",
          }}
        />
        {/* Subtle top border highlight */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(129,140,248,0.4) 50%, transparent 100%)" }}
        />

        {/* Panel content */}
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

          {/* Hero copy — centered in the available space */}
          <div className="flex-1 flex flex-col justify-center max-w-[420px]">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit mb-8"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-[0.2em]">
                Existing partner access
              </span>
            </div>

            <h1
              className="text-white font-extrabold leading-[1.06] tracking-[-0.04em]"
              style={{ fontSize: "clamp(2rem, 3vw, 2.7rem)" }}
            >
              Back to
              <br />
              your partner
              <br />
              workspace.
              <br />
              <span style={{ color: "#818cf8" }}>No filler.</span>
            </h1>

            <p className="mt-5 text-zinc-400 text-[15px] leading-[1.7]">
              Sign in to continue where you left off: leads, submissions, onboarding progress, and account updates.
            </p>

            {/* Workspace value points */}
            <div
              className="mt-10 rounded-2xl p-5 space-y-4"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              <p className="text-[11px] text-zinc-500 uppercase tracking-[0.2em] font-semibold mb-4">
                Inside your workspace
              </p>
              <div className="space-y-4">
                {workspacePoints.map(({ icon: Icon, title, description, color }) => (
                  <div key={title} className="flex items-start gap-3.5">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18` }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm tracking-tight">{title}</p>
                      <p className="text-zinc-500 text-[12px] leading-5 mt-1">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-14 lg:px-14"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}
      >
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

        <div className="w-full max-w-[360px]">
          <h2
            className="text-white font-extrabold tracking-[-0.04em] leading-tight mb-1.5"
            style={{ fontSize: "1.875rem" }}
          >
            Welcome back
          </h2>
          <p className="text-zinc-500 text-sm mb-8">
            Sign in to your Finanshels partner account
          </p>

          <PartnerSignInForm />

          <div
            className="mt-8 pt-8 text-center space-y-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-sm text-zinc-600">
              Not a partner yet?{" "}
              <Link href="/register" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                Apply to join
              </Link>
            </p>
            <Link href="/" className="block text-xs text-zinc-700 hover:text-zinc-500 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
