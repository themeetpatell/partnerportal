import { ClerkFailed, ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs"
import Link from "next/link"
import {
  ArrowLeft,
  BadgeCheck,
  Check,
} from "lucide-react"
import { ClerkFallbackCard } from "@/components/clerk-fallback-card"

const perks = [
  "Real-time lead and commission tracking",
  "Submit referrals in seconds",
  "Professional partner workspace",
  "Transparent payout visibility",
]

export default function SignInPage() {
  return (
    <div className="page-wrap min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="mx-auto w-full max-w-7xl px-5 py-4 sm:px-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <span className="tag-pill">Partner portal</span>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
        <div className="mx-auto flex w-full max-w-[960px] flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-20">
          {/* Left — branding & value props (desktop only) */}
          <div className="hidden flex-1 lg:block">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-500 text-base font-black text-white shadow-[0_12px_32px_rgba(99,102,241,0.25)]">
                F
              </div>
              <div>
                <p className="font-heading text-lg font-semibold text-white">
                  Finanshels
                </p>
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  Partner Portal
                </p>
              </div>
            </div>

            <h1 className="font-heading text-3xl font-bold text-white" style={{ letterSpacing: "-0.03em" }}>
              Welcome back to your partner workspace.
            </h1>
            <p className="mt-3 max-w-md text-base leading-7 text-slate-400">
              Sign in to manage leads, track commissions, and operate from a single dashboard.
            </p>

            <div className="mt-8 space-y-3">
              {perks.map((perk) => (
                <div key={perk} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/15">
                    <Check className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <span className="text-sm text-slate-300">{perk}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-2 text-xs text-slate-600">
              <BadgeCheck className="h-3.5 w-3.5 text-indigo-400/60" />
              Trusted by 150+ partners across the GCC
            </div>
          </div>

          {/* Right — sign-in card (always centered) */}
          <div className="w-full max-w-[420px] flex flex-col items-center">
            {/* Mobile header */}
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-[0_12px_28px_rgba(99,102,241,0.28)]">
                <span className="text-xl font-bold tracking-tight">F</span>
              </div>
              <h1 className="font-heading text-2xl font-semibold text-white">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Sign in to your Finanshels Partner account
              </p>
            </div>

            <div className="w-full">
              <ClerkLoading>
                <div className="surface-card-strong h-[540px] rounded-[1.75rem] border border-white/8 bg-white/[0.03]" />
              </ClerkLoading>

              <ClerkLoaded>
                <SignIn
                  routing="path"
                  path="/sign-in"
                  signUpUrl="/sign-up"
                  forceRedirectUrl="/dashboard"
                  fallbackRedirectUrl="/dashboard"
                />
              </ClerkLoaded>

              <ClerkFailed>
                <ClerkFallbackCard ctaHref="/register" ctaLabel="Go to partner application" />
              </ClerkFailed>
            </div>

            <p className="mt-6 text-sm text-slate-500">
              Not a partner yet?{" "}
              <Link
                href="/register"
                className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
              >
                Apply to join
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
