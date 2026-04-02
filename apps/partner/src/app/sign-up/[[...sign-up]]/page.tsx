import { ClerkFailed, ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs"
import Link from "next/link"
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Sparkles,
} from "lucide-react"
import { ClerkFallbackCard } from "@/components/clerk-fallback-card"

const perks = [
  "Free to join — no upfront costs",
  "Referral partners approved instantly",
  "Real-time lead and commission tracking",
  "Dedicated partner workspace",
  "6+ service lines to refer clients for",
  "Tiered growth from Bronze to Platinum",
]

export default function SignUpPage() {
  return (
    <div className="page-wrap min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="mx-auto w-full max-w-7xl px-5 py-5 sm:px-8">
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

      {/* Split layout */}
      <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
        <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16 items-center">
          {/* Left — branding & value props */}
          <div className="hidden lg:block">
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

            <div className="eyebrow mb-6 w-fit">
              <Sparkles className="h-3.5 w-3.5" />
              Join 150+ active partners
            </div>

            <h1 className="font-heading text-3xl font-bold text-white" style={{ letterSpacing: "-0.03em" }}>
              Create your account and start earning.
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-400">
              Sign up to access the Finanshels partner network. After account creation,
              you will complete a short registration flow to go live.
            </p>

            <div className="mt-8 space-y-3.5">
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
              Trusted by consultants, agencies, and advisors across the GCC
            </div>
          </div>

          {/* Right — sign-up form */}
          <div className="flex flex-col items-center">
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-[0_12px_28px_rgba(99,102,241,0.28)]">
                <span className="text-xl font-bold tracking-tight">F</span>
              </div>
              <h1 className="font-heading text-2xl font-semibold text-white">
                Create your account
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Join the Finanshels Partner network
              </p>
            </div>

            <div className="w-full max-w-[400px]">
              <ClerkLoading>
                <div className="surface-card-strong h-[620px] rounded-[1.75rem] border border-white/8 bg-white/[0.03]" />
              </ClerkLoading>

              <ClerkLoaded>
                <SignUp
                  routing="path"
                  path="/sign-up"
                  signInUrl="/sign-in"
                  forceRedirectUrl="/register"
                  fallbackRedirectUrl="/register"
                />
              </ClerkLoaded>

              <ClerkFailed>
                <ClerkFallbackCard ctaHref="/register" ctaLabel="Open registration form" />
              </ClerkFailed>
            </div>

            <p className="mt-6 text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
