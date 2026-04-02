import { auth } from "@repo/auth/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Handshake, ShieldCheck, Users } from "lucide-react"

const models = [
  {
    type: "referral",
    icon: Users,
    title: "Referral Partner",
    description:
      "For consultants, accountants, and advisors introducing clients to Finanshels.",
    badge: "Faster path",
    points: [
      "30% of first-year package value",
      "20% on annual renewals",
      "15% on approved add-on services",
    ],
  },
  {
    type: "channel",
    icon: Handshake,
    title: "Channel Partner",
    description:
      "For agencies and operators building a deeper commercial relationship with Finanshels.",
    badge: "Manual review",
    points: [
      "30% of first-year package value",
      "20% on annual renewals",
      "50% of first payment on monthly or quarterly plans",
    ],
  },
] as const

export default async function RegisterPage() {
  const { userId } = await auth()

  if (userId) {
    redirect("/onboarding")
  }

  return (
    <div className="page-wrap min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <span className="tag-pill">Partner registration</span>
        </div>

        <section className="surface-card-strong rounded-[2.2rem] p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <div className="eyebrow">
                <ShieldCheck className="h-3.5 w-3.5" />
                Clear onboarding flow
              </div>

              <h1 className="font-heading mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Choose your partner model first.
              </h1>

              <p className="mt-5 text-sm leading-7 text-slate-300 sm:text-base">
                This is the start of the actual journey. Select the model, create your account,
                verify your email, sign in, complete onboarding, and then wait for admin approval
                before the full workspace unlocks.
              </p>

              <div className="mt-8 space-y-3 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                {[
                  "1. Select referral or channel partner",
                  "2. Create your login with that model attached",
                  "3. Verify your email and sign in",
                  "4. Complete onboarding inside the portal",
                  "5. Admin reviews and activates your partner account",
                ].map((step) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15">
                      <Check className="h-3.5 w-3.5 text-indigo-300" />
                    </div>
                    <p className="text-sm text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {models.map((model) => (
                <div
                  key={model.type}
                  className="rounded-[1.9rem] border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-200">
                      <model.icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                      {model.badge}
                    </span>
                  </div>

                  <h2 className="font-heading mt-5 text-2xl font-semibold text-white">
                    {model.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {model.description}
                  </p>

                  <div className="mt-5 space-y-2 rounded-[1.25rem] border border-white/8 bg-black/10 p-4">
                    {model.points.map((point) => (
                      <div key={point} className="flex items-start gap-2.5">
                        <div className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-300" />
                        <p className="text-sm text-slate-300">{point}</p>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={`/sign-up?type=${model.type}`}
                    className="primary-button mt-6 w-full justify-center"
                  >
                    Continue as {model.title}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
