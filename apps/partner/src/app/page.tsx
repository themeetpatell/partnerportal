import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Globe2,
  Headphones,
  LineChart,
  MessageSquareQuote,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"

/* ── Data ─────────────────────────────────────────────── */

const stats = [
  { value: "150+", label: "Active partners", sublabel: "across the GCC" },
  { value: "AED 12M+", label: "Commissions paid", sublabel: "to our network" },
  { value: "6+", label: "Service lines", sublabel: "tax, audit, formation & more" },
  { value: "48 hrs", label: "Avg. lead response", sublabel: "from submission to update" },
]

const partnerModels = [
  {
    icon: Users,
    title: "Referral Partner",
    description: "Introduce clients. Earn commissions on every converted referral. Instant approval — start earning the same day.",
    badge: "Popular",
    badgeClass: "bg-emerald-500/12 border-emerald-400/25 text-emerald-300",
    perks: ["No upfront cost", "Per-deal commission", "Dashboard access", "Instant approval"],
    rates: { initial: "30%", renewal: "20%", addon: "15%", alt: "30% first payment" },
  },
  {
    icon: BriefcaseBusiness,
    title: "Channel Partner",
    description: "Resell Finanshels services under your brand. Deeper margins, co-branded collateral, and a dedicated partnership manager.",
    badge: "Premium",
    badgeClass: "bg-indigo-500/12 border-indigo-400/25 text-indigo-300",
    perks: ["Tiered commissions", "Co-branded assets", "Priority support", "Quarterly reviews"],
    rates: { initial: "30%", renewal: "20%", addon: "15%", alt: "50% first payment" },
  },
]

const howItWorks = [
  {
    step: "01",
    icon: Rocket,
    title: "Apply in 2 minutes",
    description: "Pick your model, add company details, accept terms. Referral partners are live instantly.",
  },
  {
    step: "02",
    icon: Send,
    title: "Submit opportunities",
    description: "Use the portal to send leads or service requests. Each one is tracked with full status visibility.",
  },
  {
    step: "03",
    icon: CircleDollarSign,
    title: "Earn commissions",
    description: "When your leads convert, commissions are calculated automatically and visible in your dashboard.",
  },
]

const benefits = [
  {
    icon: LineChart,
    title: "Real-time visibility",
    description: "Track every lead, commission, and payout from a single dashboard — no spreadsheets, no back-and-forth.",
  },
  {
    icon: ShieldCheck,
    title: "Professional workspace",
    description: "A credible portal your clients and team can trust. Clean handoffs, structured workflows, branded experience.",
  },
  {
    icon: Zap,
    title: "Fast payouts",
    description: "Transparent commission tracking with configurable payment frequencies — monthly, quarterly, or on request.",
  },
  {
    icon: Headphones,
    title: "Dedicated support",
    description: "Channel partners get a partnership manager. Referral partners get a responsive support channel.",
  },
  {
    icon: Globe2,
    title: "UAE-focused expertise",
    description: "Tax registration, corporate formation, audit, bookkeeping — services your clients actually need in the GCC.",
  },
  {
    icon: TrendingUp,
    title: "Grow with tiers",
    description: "Start at Bronze and grow to Platinum. Higher tiers unlock better rates, priority processing, and co-marketing.",
  },
]

const testimonials = [
  {
    quote: "Finanshels made my advisory practice more profitable. I just refer clients and the commissions show up in my dashboard within days.",
    name: "Priya Sharma",
    title: "Independent Tax Consultant",
    location: "Dubai, UAE",
  },
  {
    quote: "The portal is genuinely polished. My clients see it as an extension of my agency — that credibility matters.",
    name: "Omar Al-Rashid",
    title: "Managing Director, Gulf Business Advisory",
    location: "Abu Dhabi, UAE",
  },
  {
    quote: "I went from zero to 15 converted referrals in 3 months. The tracking is transparent and the team follows up fast.",
    name: "Sarah Chen",
    title: "Freelance Business Consultant",
    location: "Sharjah, UAE",
  },
]

const faqs = [
  {
    q: "How much does it cost to join?",
    a: "Nothing. Joining the Finanshels partner network is completely free for both referral and channel models.",
  },
  {
    q: "How are commissions calculated?",
    a: "Commissions are based on the service revenue from your referred clients. Rates vary by tier and partner model — referral partners earn a flat percentage, channel partners can negotiate tiered structures.",
  },
  {
    q: "How quickly can I start earning?",
    a: "Referral partners are approved instantly. Submit your first lead the same day. Commissions are tracked in real-time from the moment a lead converts.",
  },
  {
    q: "What services can I refer clients for?",
    a: "Corporate formation, tax registration, VAT filing, audit & assurance, bookkeeping, and advisory services across the UAE and GCC.",
  },
  {
    q: "Do I need a license or qualification?",
    a: "No. Referral partners can be consultants, freelancers, or anyone with a business network. Channel partners benefit from having an established business entity.",
  },
]

/* ── Page ─────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="page-wrap min-h-screen">
      {/* ── Navbar ──────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/6 backdrop-blur-xl bg-[#09090b]/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-500 text-sm font-black text-white shadow-[0_8px_24px_rgba(99,102,241,0.25)]">
              F
            </div>
            <div className="hidden sm:block">
              <p className="font-heading text-base font-semibold text-white leading-tight">
                Finanshels
              </p>
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                Partner Portal
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            <a href="#how-it-works" className="text-sm text-slate-400 transition-colors hover:text-white">
              How it works
            </a>
            <a href="#benefits" className="text-sm text-slate-400 transition-colors hover:text-white">
              Benefits
            </a>
            <a href="#faq" className="text-sm text-slate-400 transition-colors hover:text-white">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="secondary-button !py-2 !px-3.5 text-xs sm:text-sm sm:!px-4">
              Sign in
            </Link>
            <Link href="/register" className="primary-button !py-2 !px-3.5 text-xs sm:text-sm sm:!px-4">
              Become a partner
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* ── Hero ──────────────────────────────────── */}
        <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 lg:pt-28 lg:pb-32">
          <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-indigo-500/8 blur-[100px]" />
          <div className="absolute right-0 top-32 h-64 w-64 rounded-full bg-violet-500/8 blur-[100px]" />

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="eyebrow mx-auto mb-8 w-fit">
              <Sparkles className="h-3.5 w-3.5" />
              Trusted by 150+ partners across the GCC
            </div>

            <h1 className="hero-title text-white">
              Earn commissions by referring clients to&nbsp;
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
                Finanshels.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg sm:leading-8">
              Join the partner network trusted by consultants, agencies, and advisors across
              the UAE. Submit leads, track conversions, and get paid — all from one workspace.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="primary-button !rounded-xl !px-7 !py-3.5 text-base shadow-[0_16px_48px_rgba(99,102,241,0.25)] hover:shadow-[0_20px_60px_rgba(99,102,241,0.35)] transition-shadow"
              >
                Start earning today
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="secondary-button !rounded-xl !px-7 !py-3.5 text-base"
              >
                See how it works
              </Link>
            </div>

            <p className="mt-6 text-xs text-slate-600">
              Free to join — No license required — Referral partners approved instantly
            </p>
          </div>

          {/* Stats bar */}
          <div className="relative mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="surface-card rounded-2xl px-5 py-5 text-center transition-colors hover:border-zinc-700"
              >
                <p className="font-heading text-3xl font-bold text-white">{s.value}</p>
                <p className="mt-1.5 text-sm font-medium text-slate-200">{s.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{s.sublabel}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Partner Models ───────────────────────── */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="eyebrow mx-auto mb-5 w-fit">
              <Building2 className="h-3.5 w-3.5" />
              Two ways to partner
            </div>
            <h2 className="page-title">Choose the model that fits your business</h2>
            <p className="page-subtitle mt-3">
              Whether you refer occasionally or want a deep commercial relationship,
              there is a path built for you.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {partnerModels.map((model) => (
              <div
                key={model.title}
                className="surface-card-strong group relative overflow-hidden rounded-[2rem] p-7 sm:p-8 transition-all hover:border-zinc-600"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-200">
                    <model.icon className="h-6 w-6" />
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${model.badgeClass}`}>
                    {model.badge}
                  </span>
                </div>

                <h3 className="font-heading mt-6 text-2xl font-semibold text-white">
                  {model.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {model.description}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-2.5">
                  {model.perks.map((perk) => (
                    <div key={perk} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="h-3.5 w-3.5 flex-shrink-0 text-indigo-400" />
                      {perk}
                    </div>
                  ))}
                </div>

                {/* Commission rates */}
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white/[0.04] border border-white/6 px-3 py-2.5 text-center">
                    <p className="text-lg font-bold text-white">{model.rates.initial}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Initial</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.04] border border-white/6 px-3 py-2.5 text-center">
                    <p className="text-lg font-bold text-white">{model.rates.renewal}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Renewals</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.04] border border-white/6 px-3 py-2.5 text-center">
                    <p className="text-lg font-bold text-white">{model.rates.addon}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Add-ons</p>
                  </div>
                </div>

                <Link
                  href="/register"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
                >
                  Get started
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ─────────────────────────── */}
        <section id="how-it-works" className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="eyebrow mx-auto mb-5 w-fit">
              <Zap className="h-3.5 w-3.5" />
              Simple, fast, transparent
            </div>
            <h2 className="page-title">Start earning in three steps</h2>
            <p className="page-subtitle mt-3">
              No complex onboarding. No hidden requirements. Apply, submit leads, earn commissions.
            </p>
          </div>

          <div className="relative mt-12 grid gap-6 lg:grid-cols-3">
            {/* Connecting line on desktop */}
            <div className="absolute top-14 left-[16.5%] right-[16.5%] hidden h-px bg-gradient-to-r from-indigo-500/30 via-indigo-500/50 to-indigo-500/30 lg:block" />

            {howItWorks.map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-200 ring-4 ring-[#09090b] relative z-10">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="mx-auto mt-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
                  {item.step}
                </div>
                <h3 className="font-heading mt-4 text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/register"
              className="primary-button !rounded-xl !px-7 !py-3.5 text-base shadow-[0_16px_48px_rgba(99,102,241,0.2)]"
            >
              Apply now — it takes 2 minutes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── Benefits Grid ────────────────────────── */}
        <section id="benefits" className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="eyebrow mx-auto mb-5 w-fit">
              <Star className="h-3.5 w-3.5" />
              Why partners choose us
            </div>
            <h2 className="page-title">Everything you need to earn with confidence</h2>
            <p className="page-subtitle mt-3">
              A partner workspace designed for transparency, speed, and professional credibility.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="surface-card rounded-[1.75rem] p-6 transition-colors hover:border-zinc-700"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-200">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading mt-5 text-lg font-semibold text-white">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────── */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="eyebrow mx-auto mb-5 w-fit">
              <MessageSquareQuote className="h-3.5 w-3.5" />
              Partner voices
            </div>
            <h2 className="page-title">Hear from our partners</h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="surface-card-strong rounded-[2rem] p-6 sm:p-7"
              >
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-7 text-slate-300">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="mt-5 border-t border-white/8 pt-4">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.title}</p>
                  <p className="text-xs text-slate-600">{t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────── */}
        <section id="faq" className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="page-title">Frequently asked questions</h2>
            <p className="page-subtitle mt-3">
              Everything you need to know before joining.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group surface-card rounded-2xl overflow-hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-sm font-medium text-white transition-colors hover:text-indigo-300 [&::-webkit-details-marker]:hidden list-none">
                  {faq.q}
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-500 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-5 text-sm leading-7 text-slate-400">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA Banner ───────────────────────────── */}
        <section className="py-16 sm:py-20">
          <div className="surface-card-strong relative overflow-hidden rounded-[2.5rem] px-6 py-14 text-center sm:px-12 sm:py-20">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
            <div className="absolute -left-20 top-10 h-48 w-48 rounded-full bg-indigo-500/10 blur-[80px]" />
            <div className="absolute -right-20 bottom-10 h-48 w-48 rounded-full bg-violet-500/10 blur-[80px]" />

            <div className="relative">
              <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl lg:text-5xl" style={{ letterSpacing: "-0.04em" }}>
                Ready to grow your revenue?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
                Join 150+ partners earning commissions through the Finanshels network.
                Apply in 2 minutes — start referring the same day.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="primary-button !rounded-xl !px-8 !py-3.5 text-base shadow-[0_16px_48px_rgba(99,102,241,0.3)]"
                >
                  Become a partner
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/sign-in" className="secondary-button !rounded-xl !px-8 !py-3.5 text-base">
                  Already a partner? Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="border-t border-white/6 mt-4">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-500 text-sm font-black text-white">
                  F
                </div>
                <div>
                  <p className="font-heading text-base font-semibold text-white">Finanshels</p>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Partner Portal</p>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
                The partner workspace for referrals, service requests, and commission visibility across the UAE and GCC.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <Link href="/register" className="text-slate-400 transition-colors hover:text-white">
                Become a partner
              </Link>
              <Link href="/sign-in" className="text-slate-400 transition-colors hover:text-white">
                Sign in
              </Link>
              <a href="#how-it-works" className="text-slate-400 transition-colors hover:text-white">
                How it works
              </a>
              <a href="#faq" className="text-slate-400 transition-colors hover:text-white">
                FAQ
              </a>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-white/6 pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 text-indigo-400/60" />
              Trusted by 150+ partners across the GCC
            </div>
            <span>© {new Date().getFullYear()} Finanshels. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
