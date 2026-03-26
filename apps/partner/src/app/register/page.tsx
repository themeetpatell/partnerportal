"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  Handshake,
  Building2,
  Phone,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronRight,
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
  { number: 1, label: "Partner Type" },
  { number: 2, label: "Company Details" },
  { number: 3, label: "Terms" },
  { number: 4, label: "Done" },
]

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-10">
      {STEPS.map((step, i) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                currentStep > step.number
                  ? "bg-blue-600 text-white"
                  : currentStep === step.number
                    ? "bg-blue-600 text-white ring-4 ring-blue-600/20"
                    : "bg-zinc-800 text-zinc-500 border border-zinc-700"
              }`}
            >
              {currentStep > step.number ? (
                <Check className="w-4 h-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={`text-xs mt-1.5 font-medium hidden sm:block ${
                currentStep >= step.number ? "text-zinc-300" : "text-zinc-600"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-12 sm:w-20 h-px mx-1 sm:mx-2 mb-4 transition-colors ${
                currentStep > step.number ? "bg-blue-600" : "bg-zinc-800"
              }`}
            />
          )}
        </div>
      ))}
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
      <h2 className="text-xl font-bold text-white mb-2">
        Choose your partnership type
      </h2>
      <p className="text-zinc-400 text-sm mb-8">
        Select the model that best fits how you work with clients.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Referral Partner */}
        <button
          type="button"
          onClick={() => onSelect("referral")}
          className={`text-left p-5 rounded-xl border-2 transition-all ${
            selected === "referral"
              ? "border-blue-500 bg-blue-950/30"
              : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                selected === "referral"
                  ? "bg-blue-600/30 border border-blue-500/50"
                  : "bg-zinc-800 border border-zinc-700"
              }`}
            >
              <Users
                className={`w-5 h-5 ${selected === "referral" ? "text-blue-400" : "text-zinc-400"}`}
              />
            </div>
            {selected === "referral" && (
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <h3 className="text-zinc-100 font-semibold mb-1">
            Referral Partner
          </h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Refer clients to Finanshels and earn a commission for each
            successful conversion. Perfect for advisors and consultants.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-950/50 border border-green-800/40 px-2 py-1 rounded-full">
              <Check className="w-3 h-3" />
              Instant approval
            </span>
          </div>
        </button>

        {/* Channel Partner */}
        <button
          type="button"
          onClick={() => onSelect("channel")}
          className={`text-left p-5 rounded-xl border-2 transition-all ${
            selected === "channel"
              ? "border-blue-500 bg-blue-950/30"
              : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                selected === "channel"
                  ? "bg-blue-600/30 border border-blue-500/50"
                  : "bg-zinc-800 border border-zinc-700"
              }`}
            >
              <Handshake
                className={`w-5 h-5 ${selected === "channel" ? "text-blue-400" : "text-zinc-400"}`}
              />
            </div>
            {selected === "channel" && (
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <h3 className="text-zinc-100 font-semibold mb-1">Channel Partner</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Resell Finanshels services under your brand or as part of your
            offerings. Ideal for agencies and business service firms.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-yellow-400 bg-yellow-950/50 border border-yellow-800/40 px-2 py-1 rounded-full">
              <User className="w-3 h-3" />
              Manual review
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

function Step2CompanyDetails({
  formData,
  onChange,
}: {
  formData: FormData
  onChange: (field: keyof FormData, value: string) => void
}) {
  const fields = [
    {
      key: "companyName" as const,
      label: "Company Name",
      placeholder: "Acme Consulting LLC",
      icon: Building2,
      type: "text",
      required: true,
    },
    {
      key: "contactName" as const,
      label: "Contact Name",
      placeholder: "John Smith",
      icon: User,
      type: "text",
      required: true,
    },
    {
      key: "email" as const,
      label: "Business Email",
      placeholder: "john@acmeconsulting.com",
      icon: Mail,
      type: "email",
      required: true,
    },
    {
      key: "phone" as const,
      label: "Phone Number",
      placeholder: "+971 50 123 4567",
      icon: Phone,
      type: "tel",
      required: false,
    },
  ]

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-2">Company details</h2>
      <p className="text-zinc-400 text-sm mb-8">
        Tell us about your company so we can set up your partner account.
      </p>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              {field.label}
              {field.required && (
                <span className="text-red-400 ml-1">*</span>
              )}
            </label>
            <div className="relative">
              <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type={field.type}
                value={formData[field.key] as string}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
              />
            </div>
          </div>
        ))}
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
      <h2 className="text-xl font-bold text-white mb-2">
        Terms &amp; Conditions
      </h2>
      <p className="text-zinc-400 text-sm mb-6">
        Please review and accept our partner agreement before continuing.
      </p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 h-56 overflow-y-auto">
        <h3 className="text-zinc-200 font-semibold text-sm mb-3">
          Finanshels Partner Agreement
        </h3>
        <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
          <p>
            <strong className="text-zinc-300">1. Partnership Terms.</strong>{" "}
            By registering as a Finanshels partner, you agree to operate in
            accordance with all applicable laws and regulations in the UAE and
            any jurisdiction where you conduct business.
          </p>
          <p>
            <strong className="text-zinc-300">2. Commissions.</strong>{" "}
            {partnerType === "channel"
              ? "Channel partners earn commissions as defined in their individual channel agreement, which will be provided upon approval."
              : "Referral partners earn a commission for each client they refer who converts to a paying Finanshels customer. Commission rates are outlined in your partner dashboard."}
          </p>
          <p>
            <strong className="text-zinc-300">3. Confidentiality.</strong>{" "}
            Partners must maintain strict confidentiality regarding client
            information, pricing structures, and proprietary Finanshels
            processes and systems.
          </p>
          <p>
            <strong className="text-zinc-300">4. Conduct.</strong> Partners
            must not make representations about Finanshels services that are
            false, misleading, or not authorized in writing by Finanshels.
          </p>
          <p>
            <strong className="text-zinc-300">5. Termination.</strong>{" "}
            Either party may terminate this partnership agreement with 30
            days&apos; written notice. Finanshels reserves the right to
            immediately suspend a partner for material breach.
          </p>
          <p>
            <strong className="text-zinc-300">6. Governing Law.</strong>{" "}
            This agreement is governed by the laws of the UAE, with disputes
            subject to the jurisdiction of the Dubai courts.
          </p>
          <p>
            <strong className="text-zinc-300">7. Amendments.</strong>{" "}
            Finanshels reserves the right to update these terms with 14
            days&apos; advance notice. Continued use of the partner portal
            constitutes acceptance of revised terms.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="flex-shrink-0 mt-0.5">
          <div
            onClick={onToggle}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
              agreed
                ? "bg-blue-600 border-blue-600"
                : "bg-zinc-900 border-zinc-700 group-hover:border-zinc-500"
            }`}
          >
            {agreed && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
        <span className="text-sm text-zinc-300 leading-relaxed">
          I have read and agree to the Finanshels Partner Agreement and{" "}
          <button
            type="button"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            Privacy Policy
          </button>
          .
        </span>
      </label>
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
    <div className="text-center py-6">
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
          isReferral
            ? "bg-green-950/50 border-2 border-green-600"
            : "bg-blue-950/50 border-2 border-blue-600"
        }`}
      >
        {isReferral ? (
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        ) : (
          <Loader2 className="w-8 h-8 text-blue-400" />
        )}
      </div>

      <h2 className="text-2xl font-bold text-white mb-3">
        {isReferral ? "Welcome aboard!" : "Application Submitted!"}
      </h2>

      <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto mb-8">
        {isReferral
          ? `Your referral partner account for ${companyName} has been automatically approved. You can now sign in and start submitting leads.`
          : `Your channel partner application for ${companyName} has been received. Our team will review it within 2–3 business days and reach out via email.`}
      </p>

      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 ${
          isReferral
            ? "bg-green-950/50 border border-green-800/50 text-green-400"
            : "bg-yellow-950/50 border border-yellow-800/50 text-yellow-400"
        }`}
      >
        {isReferral ? (
          <>
            <Check className="w-4 h-4" />
            Account approved
          </>
        ) : (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Under review
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {isReferral && (
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Sign In to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium px-6 py-2.5 rounded-lg transition-colors border border-zinc-700"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!formData.type) return "Please select a partnership type."
    }
    if (step === 2) {
      if (!formData.companyName.trim()) return "Company name is required."
      if (!formData.contactName.trim()) return "Contact name is required."
      if (!formData.email.trim()) return "Email is required."
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        return "Please enter a valid email address."
    }
    if (step === 3) {
      if (!formData.agreedToTerms)
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
      // Submit registration
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: formData.type,
            companyName: formData.companyName,
            contactName: formData.contactName,
            email: formData.email,
            phone: formData.phone,
            agreedToTerms: formData.agreedToTerms,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
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

    setStep((s) => s + 1)
  }

  function handleBack() {
    setError(null)
    setStep((s) => s - 1)
  }

  const isLastStep = step === 3

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-zinc-100 font-semibold text-lg tracking-tight">
              Finanshels
            </span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Become a Partner
            </h1>
            <p className="text-zinc-400 text-sm">
              Join the Finanshels partner network in minutes
            </p>
          </div>

          {/* Step indicator */}
          <StepIndicator currentStep={step} />

          {/* Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
            {step === 1 && (
              <Step1TypeSelection
                selected={formData.type}
                onSelect={(type) => handleChange("type", type)}
              />
            )}
            {step === 2 && (
              <Step2CompanyDetails
                formData={formData}
                onChange={(field, value) => handleChange(field, value)}
              />
            )}
            {step === 3 && (
              <Step3Terms
                agreed={formData.agreedToTerms}
                onToggle={() =>
                  handleChange("agreedToTerms", !formData.agreedToTerms)
                }
                partnerType={formData.type}
              />
            )}
            {step === 4 && (
              <Step4Success
                partnerType={formData.type}
                companyName={formData.companyName}
              />
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-start gap-2.5 bg-red-950/30 border border-red-800/40 text-red-400 rounded-lg px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Navigation buttons */}
            {step < 4 && (
              <div className="flex items-center justify-between mt-8">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={loading}
                    className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      {isLastStep ? "Submit Application" : "Continue"}
                      {!isLastStep && <ChevronRight className="w-4 h-4" />}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Sign in link */}
          {step < 4 && (
            <p className="text-center text-zinc-600 text-sm mt-6">
              Already a partner?{" "}
              <Link
                href="/sign-in"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
