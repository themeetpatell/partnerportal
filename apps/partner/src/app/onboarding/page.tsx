"use client"

import { useEffect, useState } from "react"
import { useUser } from "@repo/auth/client"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
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
  { number: 3, label: "Agreement" },
  { number: 4, label: "Done" },
]

const PARTNER_MODELS = {
  referral: {
    icon: Users,
    title: "Referral Partner",
    description:
      "Best for consultants, accountants, and advisors who introduce clients to Finanshels.",
    badge: "Admin review",
    badgeClass: "border border-white/20 bg-white/10 text-white",
    commission: {
      annual: "30% of first-year package",
      renewal: "20% of annual renewals",
      addon: "15% on add-on services",
      altRate: "30% of first payment only",
    },
  },
  channel: {
    icon: Handshake,
    title: "Channel Partner",
    description:
      "Best for agencies and operators who want a deeper commercial relationship and service resale motion.",
    badge: "Admin review",
    badgeClass: "border border-zinc-400/20 bg-zinc-400/10 text-zinc-100",
    commission: {
      annual: "30% of first-year package",
      renewal: "20% of annual renewals",
      addon: "15% on add-on services",
      altRate: "50% of first payment only",
    },
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

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
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

              {/* Commission highlights */}
              <div className="mt-4 space-y-1.5 rounded-xl border border-white/6 bg-white/[0.02] px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">Commission structure</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Initial commission</span>
                  <span className="font-semibold text-white">{config.commission.annual}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Annual renewals</span>
                  <span className="font-semibold text-white">{config.commission.renewal}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Add-on services</span>
                  <span className="font-semibold text-white">{config.commission.addon}</span>
                </div>
                <div className="mt-1.5 border-t border-white/6 pt-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Monthly/Quarterly alt.</span>
                  <span className="font-medium text-indigo-300">{config.commission.altRate}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.badgeClass}`}>
                  {config.badge}
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
  const isChannel = partnerType === "channel"
  const modelConfig = partnerType ? PARTNER_MODELS[partnerType] : null

  return (
    <div>
      <h2 className="section-title">Review the partner terms</h2>
      <p className="page-subtitle mt-2">
        This is the onboarding acknowledgement for the agreement package you will later sign in the portal after approval.
      </p>

      <div className="surface-card mt-8 max-h-[28rem] overflow-y-auto rounded-[1.75rem] p-6">
        <h3 className="font-heading text-xl font-semibold text-white">
          Finanshels {isChannel ? "Channel" : "Referral"} Partner Agreement
        </h3>

        <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
          <p>
            <strong className="text-white">1. Partnership terms.</strong> You agree to operate in
            accordance with applicable UAE laws and any jurisdiction where you conduct business.
          </p>

          <p>
            <strong className="text-white">Agreement workflow.</strong> This onboarding step confirms
            that you reviewed the commercial model and conduct expectations. The final prefilled
            agreement will be made available inside your partner profile for authorised in-app
            signing after Finanshels approves the application.
          </p>

          <p>
            <strong className="text-white">2. Commissions.</strong>{" "}
            {isChannel
              ? "Channel partner commissions are structured as outlined in the commission schedule below. Subsequent renewal commissions are payable only to Channel Partners who maintain active status and have not entered a Commercial Reset (Churn)."
              : "Referral partner commissions are earned when referred clients convert to paying Finanshels customers. Subsequent renewal commissions are payable only to Referral Partners who maintain active status and have not entered a Commercial Reset (Churn)."}
          </p>

          {/* Commission structure card */}
          {modelConfig && (
            <div className="rounded-xl border border-indigo-400/15 bg-indigo-500/5 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                Annexure II — {isChannel ? "Channel" : "Referral"} Partner Commission Structure
              </p>

              <div>
                <p className="text-xs font-semibold text-white mb-1">Annual Packages</p>
                <ul className="space-y-1 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-indigo-400 flex-shrink-0" />
                    Initial Commission: <strong className="text-white">{modelConfig.commission.annual}</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-indigo-400 flex-shrink-0" />
                    Subsequent Annual Renewal: <strong className="text-white">{modelConfig.commission.renewal}</strong>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold text-white mb-1">Add-on Services (Annual)</p>
                <ul className="space-y-1 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-indigo-400 flex-shrink-0" />
                    <strong className="text-white">{modelConfig.commission.addon}</strong> on all pre-approved add-on services
                  </li>
                </ul>
              </div>

              <div className="border-t border-white/8 pt-3">
                <p className="text-xs font-semibold text-white mb-1">Alternative Payment Plan</p>
                <p className="text-[10px] italic text-slate-500 mb-1.5">
                  Applies to Monthly/Quarterly Packages &amp; Recurring Add-On Services
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-indigo-400 flex-shrink-0" />
                    {isChannel ? "Channel" : "Referral"} Partner receives <strong className="text-white">{modelConfig.commission.altRate}</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-500 flex-shrink-0" />
                    No commission on subsequent payments
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-500 flex-shrink-0" />
                    No commission on any recurring add-on services
                  </li>
                </ul>
              </div>

              <p className="text-[10px] italic text-slate-500 pt-1">
                Actual package pricing and add-on service fees will be shared separately.
              </p>
            </div>
          )}

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
          I have read and agree to the Finanshels Partner Agreement, commission structure, and Privacy Policy.
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
  const typeLabel = partnerType === "channel" ? "channel" : "referral"

  return (
    <div className="py-6 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/12 text-indigo-200">
        <CheckCircle2 className="h-10 w-10" />
      </div>

      <h2 className="font-heading mt-6 text-3xl font-semibold text-white">
        Application submitted.
      </h2>

      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
        Your {typeLabel} partner application for {companyName} is now in review.
        Complete any remaining profile details in the portal and wait for admin approval
        before the revenue workspace unlocks.
      </p>

      <div className="mt-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-400/20 bg-zinc-400/10 px-4 py-2 text-sm font-semibold text-zinc-100">
          <ShieldCheck className="h-4 w-4" />
          Pending admin approval
        </span>
      </div>

      <div className="mt-8 flex justify-center">
        <Link href="/dashboard/profile" className="primary-button">
          Go to profile
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.partnerType) {
      return
    }

    setFormData((prev) => {
      if (prev.type === user.partnerType) {
        return prev
      }

      return {
        ...prev,
        type: user.partnerType,
      }
    })

    setStep((current) => (current === 1 ? 2 : current))
  }, [user?.partnerType])

  const lockedContact =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    ""
  const lockedEmail = user?.email || ""

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
      return "You must confirm the agreement review to continue."
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

  if (!isLoaded) {
    return (
      <div className="page-wrap min-h-screen px-5 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="surface-card rounded-[2rem] p-10 text-center text-slate-400">
            Loading onboarding…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap min-h-screen px-5 py-5 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </Link>
          <span className="tag-pill">Partner onboarding</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.15fr]">
          <aside className="surface-card-strong rounded-[2rem] p-6 sm:p-8">
            <div className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Onboarding
            </div>

            <h1 className="font-heading mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Complete your partner onboarding.
            </h1>

            <p className="mt-5 text-sm leading-7 text-slate-300 sm:text-base">
              Your login is ready. Submit the partner application here, then wait for admin
              approval before the full workspace unlocks.
            </p>

            <div className="mt-7 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                What happens next
              </p>
              <div className="mt-3 space-y-2.5 text-sm leading-6 text-slate-300">
                <p>1. Submit your company details and agreement acknowledgement.</p>
                <p>2. Finanshels reviews the application and prepares your prefilled agreement.</p>
                <p>3. Once approved and signed in the portal, the workspace unlocks.</p>
              </div>
            </div>

            {selectedModel ? (
              <div className="mt-6 rounded-[1.6rem] border border-indigo-400/18 bg-indigo-500/8 p-5">
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
                <div className="mt-4 border-t border-white/8 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
                    Core commission
                  </p>
                  <p className="mt-2 text-sm text-white">
                    {selectedModel.commission.annual}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Renewals: {selectedModel.commission.renewal}
                  </p>
                </div>
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
