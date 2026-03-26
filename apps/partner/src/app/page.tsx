import Link from "next/link"
import { ArrowRight, BarChart3, Users, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-zinc-100 font-semibold text-lg tracking-tight">
              Finanshels
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-zinc-400 hover:text-zinc-100 text-sm font-medium transition-colors px-3 py-1.5 rounded-md hover:bg-zinc-800"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors"
            >
              Become a Partner
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <Zap className="w-3.5 h-3.5" />
            Partner Portal
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
            Grow your business
            <br />
            <span className="text-blue-400">with Finanshels</span>
          </h1>

          {/* Subtitle */}
          <p className="text-zinc-400 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            Join our partner network to refer clients, manage service requests,
            and earn commissions — all from one powerful dashboard.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-in"
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium px-6 py-3 rounded-lg transition-colors border border-zinc-700 w-full sm:w-auto justify-center"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors w-full sm:w-auto justify-center"
            >
              Become a Partner
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {[
            {
              icon: Users,
              title: "Referral & Channel Partners",
              description:
                "Two partnership models to fit how you work — refer clients or resell our services directly.",
            },
            {
              icon: BarChart3,
              title: "Real-time Commission Tracking",
              description:
                "Track every lead, deal, and commission in real time. Know exactly what you've earned.",
            },
            {
              icon: Zap,
              title: "Fast Onboarding",
              description:
                "Referral partners are approved instantly. Channel partners go through a quick review process.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-800/40 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-zinc-100 font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">F</span>
            </div>
            <span className="text-zinc-500 text-sm">
              © 2025 Finanshels. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/sign-in"
              className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
