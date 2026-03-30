import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CircleDollarSign,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"

const metrics = [
  { label: "Partner models", value: "2", detail: "Referral or channel engagement" },
  { label: "Service lines", value: "6+", detail: "Finance, tax, formation, and advisory" },
  { label: "Tracking cadence", value: "Live", detail: "Lead and commission visibility in one place" },
]

const featureGroups = [
  {
    icon: Users,
    title: "Channel-ready workflows",
    description:
      "Capture qualified opportunities, hand off service requests, and keep your client handover clean.",
  },
  {
    icon: CircleDollarSign,
    title: "Commission clarity",
    description:
      "See what is pending, approved, and paid without waiting on spreadsheet updates or back-and-forth.",
  },
  {
    icon: ShieldCheck,
    title: "Built for trust",
    description:
      "A polished partner workspace that makes Finanshels feel like a serious operating partner, not a form inbox.",
  },
]

const workflow = [
  "Apply in a guided flow tailored to your partner model.",
  "Submit leads or service requests in a clean workspace.",
  "Track status, approvals, and earnings from one control surface.",
]

export default function LandingPage() {
  return (
    <div className="page-wrap min-h-screen px-5 py-5 sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl flex-col gap-6">
        <nav className="surface-card rounded-[1.8rem] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-500 text-sm font-black text-white shadow-[0_16px_40px_rgba(99,102,241,0.3)]">
                F
              </div>
              <div>
                <p className="font-heading text-lg font-semibold text-white">
                  Finanshels
                </p>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Partner Portal
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <span className="tag-pill">Live partner workspace</span>
              <Link href="/sign-in" className="secondary-button">
                Sign in
              </Link>
              <Link href="/register" className="primary-button">
                Become a partner
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <Link href="/register" className="primary-button md:hidden">
              Join
            </Link>
          </div>
        </nav>

        <main className="grid flex-1 gap-6 lg:grid-cols-[1.25fr_0.9fr]">
          <section className="surface-card-strong relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-8 sm:py-12 lg:px-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
            <div className="absolute -left-16 top-16 h-40 w-40 rounded-full bg-indigo-400/12 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-violet-500/12 blur-3xl" />

            <div className="relative max-w-3xl">
              <div className="eyebrow mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                Revenue-grade partner experience
              </div>

              <h1 className="hero-title max-w-3xl text-white">
                Build a sharper partner motion with a portal that actually feels premium.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Finanshels partners can register, submit qualified opportunities,
                request services for clients, and monitor commissions from a
                workspace designed to feel credible from the first screen.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="primary-button">
                  Start your application
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/sign-in" className="secondary-button">
                  Open the dashboard
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="surface-card rounded-[1.6rem] px-4 py-5"
                  >
                    <p className="font-heading text-3xl font-semibold text-white">
                      {metric.value}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-200">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {metric.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="surface-card rounded-[2rem] p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">
                    Control room
                  </p>
                  <h2 className="font-heading mt-2 text-2xl font-semibold text-white">
                    Built for disciplined partner operations
                  </h2>
                </div>
                <div className="rounded-full border border-indigo-400/18 bg-indigo-500/10 p-3">
                  <BriefcaseBusiness className="h-5 w-5 text-indigo-300" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {workflow.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-start gap-3 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/14 text-sm font-bold text-indigo-200">
                      0{index + 1}
                    </div>
                    <p className="pt-1 text-sm leading-6 text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {featureGroups.map((feature) => (
                <div
                  key={feature.title}
                  className="surface-card rounded-[1.75rem] p-5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-200">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-heading text-xl font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer className="flex flex-col gap-4 rounded-[1.75rem] border border-white/8 bg-white/[0.03] px-5 py-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-indigo-300" />
            Finanshels partner workspace for referrals, service requests, and commission visibility.
          </div>
          <div className="flex items-center gap-5">
            <Link href="/sign-in" className="transition-colors hover:text-white">
              Sign in
            </Link>
            <Link href="/register" className="transition-colors hover:text-white">
              Register
            </Link>
            <span>© 2026 Finanshels</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
