"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  Handshake,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react"

type PartnerType = "referral" | "channel"

interface FormData {
  type: PartnerType | null
  companyName: string
  contactName: string
  email: string
  phone: string
  agreedToTerms: boolean
}

const INITIAL_FORM: FormData = {
  type: null,
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  agreedToTerms: false,
}

const STEPS = [
  { number: 1, label: "Model" },
  { number: 2, label: "Company" },
  { number: 3, label: "Terms" },
  { number: 4, label: "Done" },
]

const PARTNER_MODELS = {
  referral: {
    icon: Users,
    title: "Referral Partner",
    description:
      "Best for consultants, accountants, and advisors who introduce clients to Finanshels.",
    badge: "Instant approval",
    badgeClass: "border border-white/20 bg-white/10 text-white",
  },
  channel: {
    icon: Handshake,
    title: "Channel Partner",
    description:
      "Best for agencies and operators who want a deeper commercial relationship and service resale motion.",
    badge: "Manual review",
    badgeClass: "border border-zinc-400/20 bg-zinc-400/10 text-zinc-100",
  },
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-3">
      {STEPS.map((step) => {
        const complete = currentStep > step.number
        const active = currentStep === step.number

        return (
          <div
            key={step.number}
            className={`flex items-center gap-3 rounded-full px-4 py-2 text-sm transition-all ${
              complete || active
                ? "border border-indigo-400/25 bg-indigo-500/10 text-white"
                : "border border-white/8 bg-white/[0.03] text-slate-400"
            }`}
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                complete || active
                  ? "bg-indigo-400 text-[#0f1027]"
                  : "bg-white/6 text-slate-400"
              }`}
            >
              {complete ? <Check className="h-3.5 w-3.5" /> : step.number}
            </div>
            <span className="font-medium">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function Step1TypeSelection({
  selected,
  onSelect,
}: {
  selected: PartnerType | null
  onSelect: (type: PartnerType) => void
}) {
  return (
    <div>
      <h2 className="section-title">Choose your partner model</h2>
      <p className="page-subtitle mt-2">
        Pick the commercial relationship that matches how you introduce or sell Finanshels services.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {(Object.entries(PARTNER_MODELS) as [PartnerType, (typeof PARTNER_MODELS)[PartnerType]][]).map(
          ([type, config]) => (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className={`rounded-[1.75rem] border p-6 text-left transition-all ${
                selected === type
                  ? "border-indigo-400/35 bg-indigo-500/10 shadow-[0_20px_50px_rgba(99,102,241,0.16)]"
                  : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-200">
                  <config.icon className="h-5 w-5" />
                </div>
                {selected === type ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-400 text-[#0f1027]">
                    <Check className="h-4 w-4" />
                  </div>
                ) : null}
              </div>

              <h3 className="font-heading mt-5 text-2xl font-semibold text-white">
                {config.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {config.description}
              </p>

              <div className="mt-5 flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.badgeClass}`}>
                  {config.badge}
                </span>
                <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Stage 01
                </span>
              </div>
            </button>
          ),
        )}
      </div>
    </div>
  )
}

function Step2CompanyDetails({
  formData,
  onChange,
  lockedContact,
  lockedEmail,
}: {
  formData: FormData
  onChange: (field: keyof FormData, value: string) => void
  lockedContact: string
  lockedEmail: string
}) {
  return (
    <div>
      <h2 className="section-title">Add your company details</h2>
      <p className="page-subtitle mt-2">
        We use this to create your partner record and route the right onboarding experience.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* Company Name */}
        <div>
          <label className="field-label">
            Company name <span className="ml-1 text-rose-300">*</span>
          </label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => onChange("companyName", e.target.value)}
              placeholder="Acme Consulting LLC"
              required
              className="field-input pl-11"
            />
          </div>
        </div>

        {/* Primary Contact — locked to signed-in user */}
        <div>
          <label className="field-label">
            Primary contact
            <span className="ml-2 text-[10px] font-normal uppercase tracking-[0.18em] text-slate-500">
              from your account
            </span>
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={lockedContact}
              readOnly
              className="field-input pl-11 cursor-not-allowed opacity-60"
            />
          </div>
        </div>

        {/* Business Email — locked to signed-in user */}
        <div className="sm:col-span-2">
          <label className="field-label">
            Business email
            <span className="ml-2 text-[10px] font-normal uppercase tracking-[0.18em] text-slate-500">
              from your account
            </span>
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={lockedEmail}
              readOnly
              className="field-input pl-11 cursor-not-allowed opacity-60"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="sm:col-span-2">
          <label className="field-label">Phone number</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="+971 50 123 4567"
              className="field-input pl-11"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Step3Terms({
  agreed,
  onToggle,
  partnerType,
}: {
  agreed: boolean
  onToggle: () => void
  partnerType: PartnerType | null
}) {
  return (
    <div>
      <h2 className="section-title">Review the partner terms</h2>
      <p className="page-subtitle mt-2">
        This keeps expectations clear around conduct, commission handling, and client confidentiality.
      </p>

      <div className="surface-card mt-8 h-72 overflow-y-auto rounded-[1.75rem] p-6">
        <h3 className="font-heading text-xl font-semibold text-white">
          Finanshels Partner Agreement
        </h3>
        <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
          <p>
            <strong className="text-white">1. Partnership terms.</strong> You agree to operate in
            accordance with applicable UAE laws and any jurisdiction where you conduct business.
          </p>
          <p>
            <strong className="text-white">2. Commissions.</strong>{" "}
            {partnerType === "channel"
              ? "Channel commissions follow the commercial terms defined during approval and onboarding."
              : "Referral commissions are earned when referred clients convert to paying Finanshels customers."}
          </p>
          <p>
            <strong className="text-white">3. Confidentiality.</strong> Client information, pricing,
            and internal Finanshels processes must be treated as confidential at all times.
          </p>
          <p>
            <strong className="text-white">4. Conduct.</strong> Partners may not make misleading claims
            about services, pricing, timelines, or deliverables.
          </p>
          <p>
            <strong className="text-white">5. Termination.</strong> Either party may end the relationship
            with written notice, and Finanshels may suspend access for material breach.
          </p>
          <p>
            <strong className="text-white">6. Governing law.</strong> This agreement is governed by the
            laws of the UAE and subject to the jurisdiction of the Dubai courts.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`mt-6 flex w-full items-start gap-3 rounded-[1.4rem] border px-4 py-4 text-left transition-all ${
          agreed
            ? "border-indigo-400/30 bg-indigo-500/10"
            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
        }`}
      >
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            agreed
              ? "border-indigo-400 bg-indigo-400 text-[#0f1027]"
              : "border-white/15 bg-transparent text-transparent"
          }`}
        >
          <Check className="h-3 w-3" />
        </div>
        <span className="text-sm leading-6 text-slate-200">
          I have read and agree to the Finanshels Partner Agreement and Privacy Policy.
        </span>
      </button>
    </div>
  )
}

function Step4Success({
  partnerType,
  companyName,
}: {
  partnerType: PartnerType | null
  companyName: string
}) {
  const isReferral = partnerType === "referral"

  return (
    <div className="py-6 text-center">
      <div
        className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
          isReferral
            ? "bg-white/12 text-white"
            : "bg-indigo-500/12 text-indigo-200"
        }`}
      >
        {isReferral ? (
          <CheckCircle2 className="h-10 w-10" />
        ) : (
          <Loader2 className="h-10 w-10 animate-spin" />
        )}
      </div>

      <h2 className="font-heading mt-6 text-3xl font-semibold text-white">
        {isReferral ? "You’re ready to start." : "Application received."}
      </h2>

      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
        {isReferral
          ? `Your referral partner account for ${companyName} has been approved. You can sign in and begin submitting opportunities immediately.`
          : `Your channel partner application for ${companyName} is now in review. Our team will follow up by email once commercial review is complete.`}
      </p>

      <div className="mt-6">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
            isReferral
              ? "border border-white/20 bg-white/10 text-white"
              : "border border-zinc-400/20 bg-zinc-400/10 text-zinc-100"
          }`}
        >
          {isReferral ? <BadgeCheck className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {isReferral ? "Account approved" : "Under review"}
        </span>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {isReferral ? (
          <Link href="/sign-in" className="primary-button">
            Sign in to dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
        <Link href="/" className="secondary-button">
          Back to home
        </Link>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const { user } = useUser()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lockedContact =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.emailAddresses[0]?.emailAddress ||
    ""
  const lockedEmail = user?.primaryEmailAddress?.emailAddress || ""

  function handleChange(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  function validateStep(): string | null {
    if (step === 1 && !formData.type) return "Please select a partnership type."
    if (step === 2) {
      if (!formData.companyName.trim()) return "Company name is required."
    }
    if (step === 3 && !formData.agreedToTerms) {
      return "You must accept the terms and conditions to continue."
    }

    return null
  }

  async function handleNext() {
    const validationError = validateStep()
    if (validationError) {
      setError(validationError)
      return
    }

    if (step === 3) {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: formData.type,
            companyName: formData.companyName,
            contactName: lockedContact,
            email: lockedEmail,
            phone: formData.phone,
            agreedToTerms: formData.agreedToTerms,
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to submit application.")
        }

        setStep(4)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.")
      } finally {
        setLoading(false)
      }

      return
    }

    setStep((current) => current + 1)
  }

  function handleBack() {
    setError(null)
    setStep((current) => current - 1)
  }

  const isLastStep = step === 3
  const selectedModel = formData.type ? PARTNER_MODELS[formData.type] : null

  return (
    <div className="page-wrap min-h-screen px-5 py-5 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <span className="tag-pill">Partner onboarding</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.15fr]">
          <aside className="surface-card-strong rounded-[2rem] p-6 sm:p-8">
            <div className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Apply once, operate cleanly
            </div>

            <h1 className="font-heading mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              A smoother way to become a Finanshels partner.
            </h1>

            <p className="mt-5 text-sm leading-7 text-slate-300 sm:text-base">
              This flow is designed to qualify your model, collect the right commercial details,
              and get you into the portal without unnecessary friction.
            </p>

            <div className="mt-8 grid gap-4">
              {[
                {
                  title: "Clear commercial path",
                  description: "Referral and channel models each get the right onboarding route.",
                },
                {
                  title: "Fast setup",
                  description: "Referral partners can start almost immediately after registration.",
                },
                {
                  title: "Professional experience",
                  description: "Your clients and internal team both benefit from a cleaner intake process.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4"
                >
                  <p className="font-heading text-lg font-semibold text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            {selectedModel ? (
              <div className="mt-8 rounded-[1.6rem] border border-indigo-400/18 bg-indigo-500/8 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-200">
                    <selectedModel.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      Selected model
                    </p>
                    <p className="font-heading text-xl font-semibold text-white">
                      {selectedModel.title}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  {selectedModel.description}
                </p>
              </div>
            ) : null}
          </aside>

          <section className="surface-card form-shell">
            <StepIndicator currentStep={step} />

            {step === 1 ? (
              <Step1TypeSelection
                selected={formData.type}
                onSelect={(type) => handleChange("type", type)}
              />
            ) : null}

            {step === 2 ? (
              <Step2CompanyDetails
                formData={formData}
                onChange={handleChange}
                lockedContact={lockedContact}
                lockedEmail={lockedEmail}
              />
            ) : null}

            {step === 3 ? (
              <Step3Terms
                agreed={formData.agreedToTerms}
                onToggle={() => handleChange("agreedToTerms", !formData.agreedToTerms)}
                partnerType={formData.type}
              />
            ) : null}

            {step === 4 ? (
              <Step4Success
                partnerType={formData.type}
                companyName={formData.companyName}
              />
            ) : null}

            {error ? (
              <div className="mt-6 rounded-[1.25rem] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            {step < 4 ? (
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={step === 1 || loading}
                  className="secondary-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="primary-button disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting
                    </>
                  ) : (
                    <>
                      {isLastStep ? "Submit application" : "Continue"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
