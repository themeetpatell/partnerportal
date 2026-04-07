"use client"

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { useUser } from "@repo/auth/client"
import Link from "next/link"
import Image from "next/image"
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
  signatureMode: "typed" | "draw"
  typedSignature: string
  signatureDataUrl: string | null
}

const INITIAL_FORM: FormData = {
  type: null,
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  agreedToTerms: false,
  signatureMode: "typed",
  typedSignature: "",
  signatureDataUrl: null,
}

const STEPS = [
  { number: 1, label: "Details" },
  { number: 2, label: "Agreement" },
  { number: 3, label: "Done" },
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

function Step1ModelAndDetails({
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
  const isChannel = formData.type === "channel"

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
              onClick={() => onChange("type", type)}
              className={`rounded-[1.75rem] border p-6 text-left transition-all ${
                formData.type === type
                  ? "border-indigo-400/35 bg-indigo-500/10 shadow-[0_20px_50px_rgba(99,102,241,0.16)]"
                  : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-200">
                  <config.icon className="h-5 w-5" />
                </div>
                {formData.type === type ? (
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

      {/* Details section — shown once a type is selected */}
      {formData.type ? (
        <div className="mt-10">
          <h2 className="section-title">
            {isChannel ? "Add your company details" : "Add your details"}
          </h2>
          <p className="page-subtitle mt-2">
            We use this to create your partner record and route the right onboarding experience.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {/* Company Name */}
            <div>
              <label className="field-label">
                Company name{" "}
                {isChannel ? (
                  <span className="ml-1 text-rose-300">*</span>
                ) : (
                  <span className="ml-2 text-[10px] font-normal uppercase tracking-[0.18em] text-slate-500">
                    optional
                  </span>
                )}
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => onChange("companyName", e.target.value)}
                  placeholder="Acme Consulting LLC"
                  required={isChannel}
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
      ) : null}
    </div>
  )
}

function Step3Terms({
  formData,
  onToggle,
  onChange,
  partnerType,
  contactName,
  contactEmail,
}: {
  formData: FormData
  onToggle: () => void
  onChange: (field: keyof FormData, value: string | boolean | null) => void
  partnerType: PartnerType | null
  contactName: string
  contactEmail: string
}) {
  const isChannel = partnerType === "channel"
  const modelConfig = partnerType ? PARTNER_MODELS[partnerType] : null
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    context.lineWidth = 2.5
    context.lineCap = "round"
    context.lineJoin = "round"
    context.strokeStyle = "#c7d2fe"
    context.fillStyle = "#0b1020"
    context.fillRect(0, 0, canvas.width, canvas.height)

    if (formData.signatureDataUrl) {
      const image = new window.Image()
      image.onload = () => {
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
      }
      image.src = formData.signatureDataUrl
    }
  }, [formData.signatureDataUrl])

  function getCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const context = canvasRef.current?.getContext("2d")
    const point = getCanvasPoint(event)
    if (!context || !point) return
    drawingRef.current = true
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const context = canvasRef.current?.getContext("2d")
    const point = getCanvasPoint(event)
    if (!context || !point) return
    context.lineTo(point.x, point.y)
    context.stroke()
    const nextDataUrl = canvasRef.current?.toDataURL("image/png") || null
    onChange("signatureDataUrl", nextDataUrl || "")
  }

  function handlePointerUp() {
    drawingRef.current = false
  }

  function clearSignature() {
    onChange("signatureDataUrl", null)
  }

  const typedSignatureValue = formData.typedSignature || contactName
  const partnerLabel = isChannel ? "Channel Partner" : "Referral Partner"
  const serviceList = isChannel
    ? [
        "Bookkeeping",
        "Tax Consultancy",
        "Audit Services",
        "Liquidation Services",
        "Financial Advisory Services",
        "AML Services",
        "Compliance Services",
      ]
    : [
        "Bookkeeping",
        "Tax Consultancy",
        "Audit Services",
        "Liquidation Services",
        "Financial Advisory Services",
      ]
  const agreementSections = [
    {
      title: "1. Purpose",
      clauses: [
        "The First Party agrees to provide the financial services listed in Annexure I, together with any approved related services communicated in writing.",
        `The ${partnerLabel} will introduce potential clients to the First Party for those services, and the applicable client engagement terms of Finanshels will govern the delivery of those services.`,
      ],
    },
    {
      title: "2. Relationship of Parties",
      clauses: [
        "Nothing in this Agreement creates any agency, partnership, joint venture, franchise, or employment relationship between the Parties.",
        "Neither Party is authorized to bind, represent, or create obligations on behalf of the other Party unless expressly approved in writing.",
      ],
    },
    {
      title: "3. Responsibilities of the Parties",
      clauses: [
        `The ${partnerLabel} will submit only legitimate referrals from prospects who have consented to be contacted and whose needs fit the First Party's services.`,
        "The First Party will manage qualification, commercials, onboarding, and delivery for any client accepted through the partnership.",
        "The First Party may share reasonable updates on referred opportunities, subject to confidentiality, compliance, and client-consent boundaries.",
        `The ${partnerLabel} may not make misleading statements about pricing, scope, timelines, licensing, or service outcomes.`,
      ],
    },
    {
      title: "4. Referral Fees and Payment Terms",
      clauses: [
        `The First Party will pay the ${partnerLabel} in accordance with Annexure II: ${partnerLabel} Commission Structure.`,
        "Eligible commissions are payable within thirty (30) days after the First Party receives cleared payment from the referred client, unless otherwise stated in writing.",
      ],
    },
    {
      title: "5. Renewal Commission Eligibility",
      clauses: [
        `Annual renewal commissions apply only while the ${partnerLabel} maintains active status.`,
        `If the ${partnerLabel} does not submit any qualified lead for ninety (90) consecutive days, the partner is considered to be in a Commercial Reset (Churn) period and renewal commissions stop during that period.`,
        `Renewal commissions resume only for client renewals occurring after the ${partnerLabel} regains active status by submitting a new qualified lead accepted by Finanshels.`,
      ],
    },
    {
      title: "6. Term and Termination",
      clauses: [
        "This Agreement starts on the Effective Date and remains in force for one (1) year, automatically renewing for successive one-year periods unless terminated by either Party on thirty (30) days written notice.",
        "Termination does not remove the obligation to pay valid commissions already earned under this Agreement.",
      ],
    },
    {
      title: "7. Confidentiality",
      clauses: [
        "Both Parties must maintain the confidentiality of client, pricing, commercial, and operational information exchanged under this Agreement, except where disclosure is required by law.",
      ],
    },
    {
      title: "8. Limitation of Liability and Indemnification",
      clauses: [
        "Neither Party is liable for indirect, incidental, special, or consequential damages arising from this Agreement.",
        "Each Party agrees to indemnify the other against direct claims, damages, and costs resulting from its own breach, misrepresentation, or unlawful conduct.",
        "For the avoidance of doubt, Finanshels' aggregate liability under this Agreement will not exceed the total commission payable to the Second Party under this Agreement.",
      ],
    },
    {
      title: "9. Non-Solicitation",
      clauses: [
        "During the term of this Agreement and for one (1) year after termination, neither Party may solicit or induce the other Party's clients to end or reduce their business relationship for competing services.",
        "During the same period, neither Party may solicit the other Party's employees or contractors away for competing activities.",
      ],
    },
    {
      title: "10. Dispute Resolution",
      clauses: [
        "The Parties will first attempt to resolve disputes through good-faith negotiations within thirty (30) days.",
        "If unresolved, the dispute will be settled by arbitration under the rules of the Dubai International Arbitration Centre (DIAC) in Dubai, UAE, in English.",
        "Either Party may seek interim or urgent relief from the courts of Dubai where necessary.",
      ],
    },
    {
      title: "11. Miscellaneous",
      clauses: [
        "Neither Party is liable for delay or failure in performance caused by events beyond its reasonable control, including natural disasters, government restrictions, or acts of God.",
        "This Agreement represents the complete understanding between the Parties and supersedes all prior discussions and understandings relating to the partnership.",
        "Any amendment to this Agreement must be in writing and signed by both Parties.",
      ],
    },
  ]

  return (
    <div>
      <h2 className="section-title">Review the partner terms</h2>
      <p className="page-subtitle mt-2">
        Review the agreement summary, confirm the commercial terms, and sign here as the authorized representative.
      </p>

      <div className="surface-card mt-8 overflow-hidden rounded-[1.75rem] border border-white/8">
        <div className="relative max-h-[36rem] overflow-y-auto px-6 py-6 sm:px-8">
          <Image
            src="/brand-mark.png"
            alt=""
            width={360}
            height={360}
            className="pointer-events-none absolute bottom-0 right-0 w-[360px] opacity-[0.05] select-none"
          />

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-300">
                  Finanshels Partner Agreement
                </p>
                <h3 className="mt-3 font-heading text-2xl font-semibold text-white">
                  {partnerLabel} Agreement
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                  This agreement governs the commercial relationship between Finanshels Accounting
                  Technologies LLC and the {partnerLabel}.
                  By signing below, both parties confirm the particulars, commercial terms, and
                  conduct obligations described here.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <div>Effective Date: Submission date</div>
                <div className="mt-1">Jurisdiction: Dubai, UAE</div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  First Party
                </p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <p><span className="text-slate-500">Company:</span> Finanshels Accounting Technologies LLC</p>
                  <p><span className="text-slate-500">Licensing Authority:</span> Sharjah Media City (Shams) Free Zone</p>
                  <p><span className="text-slate-500">Trade License Number:</span> 2221700.01</p>
                  <p><span className="text-slate-500">Registered Address:</span> Sharjah Media City, Sharjah, UAE</p>
                  <p><span className="text-slate-500">Signatory:</span> Muhammed Shafeeq, CEO</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Second Party
                </p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <p><span className="text-slate-500">Partner type:</span> {partnerLabel}</p>
                  {formData.companyName ? (
                    <p><span className="text-slate-500">Company:</span> {formData.companyName}</p>
                  ) : null}
                  <p><span className="text-slate-500">Authorized signatory:</span> {contactName || "Your full name"}</p>
                  <p><span className="text-slate-500">Email:</span> {contactEmail || "your@email.com"}</p>
                  <p><span className="text-slate-500">Phone:</span> {formData.phone || "Not provided"}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-5 text-sm leading-7 text-slate-300">
              {agreementSections.map((section) => (
                <div key={section.title}>
                  <h4 className="font-semibold text-white">{section.title}</h4>
                  <div className="mt-2 space-y-2.5">
                    {section.clauses.map((clause) => (
                      <p key={clause}>{clause}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-5">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Annexure I • Service List
                </p>
                <div className="mt-4 overflow-hidden rounded-xl border border-white/8">
                  <div className="grid grid-cols-[88px_minmax(0,1fr)] bg-white/[0.04] text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <div className="border-r border-white/8 px-4 py-3">Sl. No.</div>
                    <div className="px-4 py-3">Services</div>
                  </div>
                  {serviceList.map((service, index) => (
                    <div
                      key={service}
                      className="grid grid-cols-[88px_minmax(0,1fr)] border-t border-white/8 text-sm text-slate-200"
                    >
                      <div className="border-r border-white/8 px-4 py-3 text-slate-400">
                        {index + 1}
                      </div>
                      <div className="px-4 py-3">{service}</div>
                    </div>
                  ))}
                </div>
              </div>

              {modelConfig && (
                <div className="rounded-2xl border border-indigo-400/15 bg-indigo-500/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                    {isChannel
                      ? "Annexure II • Channel Partner Commission Structure"
                      : "Annexure II • Referral Partner Commission Structure"}
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold text-white">Annual Packages</p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                        <li>Initial commission: {modelConfig.commission.annual}</li>
                        <li>Subsequent annual renewal commission: {modelConfig.commission.renewal}</li>
                      </ul>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold text-white">Add-on Services (Annual)</p>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {modelConfig.commission.addon} on all pre-approved add-on services.
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold text-white">
                        Alternative Payment Plan
                      </p>
                      <p className="text-xs leading-6 text-slate-500">
                        Applies to monthly or quarterly packages and recurring add-on services.
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                        <li>{partnerLabel} receives {modelConfig.commission.altRate}.</li>
                        <li>No commission on subsequent payments.</li>
                        <li>No commission on recurring add-on services.</li>
                      </ul>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-6 text-slate-400">
                    Actual package pricing and approved add-on service fees will be shared separately.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  First Party Signature
                </p>
                <div className="mt-4 rounded-2xl border border-white/8 bg-[#0b1020] p-4">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center">
                    <div className="flex min-h-[118px] items-center rounded-xl border border-indigo-400/15 bg-indigo-500/6 px-4 py-4">
                      <Image
                        src="/finanshels-owner-signature.png"
                        alt="Muhammed Shafeeq signature"
                        width={320}
                        height={120}
                        className="h-auto w-full max-w-[260px] rounded-lg bg-white/95 object-contain p-2"
                      />
                    </div>
                    <div className="mx-auto w-full max-w-[150px]">
                      <Image
                        src="/finanshels-owner-stamp.png"
                        alt="Finanshels company stamp"
                        width={220}
                        height={220}
                        className="h-auto w-full object-contain opacity-90"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t border-white/8 pt-4 text-sm leading-6 text-slate-300">
                  <p>Muhammed Shafeeq</p>
                  <p>CEO</p>
                  <p>Authorized Signatory</p>
                  <p>Finanshels Accounting Technologies LLC</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Second Party Signature
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChange("signatureMode", "typed")}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      formData.signatureMode === "typed"
                        ? "bg-indigo-400 text-[#101426]"
                        : "border border-white/10 bg-white/[0.03] text-slate-300"
                    }`}
                  >
                    Type signature
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange("signatureMode", "draw")}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      formData.signatureMode === "draw"
                        ? "bg-indigo-400 text-[#101426]"
                        : "border border-white/10 bg-white/[0.03] text-slate-300"
                    }`}
                  >
                    Draw signature
                  </button>
                </div>

                {formData.signatureMode === "typed" ? (
                  <div className="mt-4">
                    <label className="field-label">Typed signature</label>
                    <input
                      type="text"
                      value={typedSignatureValue}
                      onChange={(event) => onChange("typedSignature", event.target.value)}
                      className="field-input mt-2"
                      placeholder="Type your full name"
                    />
                    <div className="mt-4 flex min-h-[176px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0b1020] px-4 py-6 text-center">
                      <p className="text-4xl leading-none text-indigo-200 [font-family:cursive] sm:text-5xl">
                        {typedSignatureValue || "Your signature"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <label className="field-label">Draw signature</label>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={720}
                      height={180}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      className="mt-2 h-44 w-full rounded-2xl border border-dashed border-white/10 bg-[#0b1020] touch-none"
                    />
                  </div>
                )}

                <div className="mt-4 border-t border-white/8 pt-4 text-sm leading-6 text-slate-300">
                  <p>{contactName || "Authorized signatory"}</p>
                  <p>Authorized Signatory</p>
                  {formData.companyName ? <p>{formData.companyName}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`mt-6 flex w-full items-start gap-3 rounded-[1.4rem] border px-4 py-4 text-left transition-all ${
          formData.agreedToTerms
            ? "border-indigo-400/30 bg-indigo-500/10"
            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
        }`}
      >
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
            formData.agreedToTerms
              ? "border-indigo-400 bg-indigo-400 text-[#0f1027]"
              : "border-slate-400 bg-transparent text-transparent"
          }`}
        >
          <Check className="h-3 w-3" />
        </div>
        <span className="text-sm leading-6 text-slate-200">
          I have reviewed the agreement summary above, confirm that the signature is mine, and agree to the Finanshels Partner Agreement, commission structure, and Privacy Policy.
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
        Your {typeLabel} partner application{companyName ? ` for ${companyName}` : ""} is now in review.
        Your agreement acknowledgement and signature were captured during onboarding, so the
        remaining step is admin approval before the revenue workspace unlocks.
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
  }, [user?.partnerType])

  useEffect(() => {
    const defaultName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || ""

    if (!defaultName) return

    setFormData((prev) =>
      prev.typedSignature ? prev : { ...prev, typedSignature: defaultName }
    )
  }, [user?.email, user?.firstName, user?.lastName])

  const lockedContact =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    ""
  const lockedEmail = user?.email || ""

  function handleChange(field: keyof FormData, value: string | boolean | null) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!formData.type) return "Please select a partnership type."
      if (formData.type === "channel" && !formData.companyName.trim())
        return "Company name is required for channel partners."
    }
    if (step === 2 && !formData.agreedToTerms) {
      return "You must confirm the agreement review to continue."
    }
    if (step === 2 && formData.signatureMode === "typed" && !formData.typedSignature.trim()) {
      return "Please type your signature to continue."
    }
    if (step === 2 && formData.signatureMode === "draw" && !formData.signatureDataUrl) {
      return "Please draw your signature to continue."
    }

    return null
  }

  async function handleNext() {
    const validationError = validateStep()
    if (validationError) {
      setError(validationError)
      return
    }

    if (step === 2) {
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
            signatureType: formData.signatureMode === "draw" ? "drawn" : "typed",
            signatureName: formData.typedSignature.trim() || lockedContact,
            signatureDataUrl:
              formData.signatureMode === "draw" ? formData.signatureDataUrl : null,
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to submit application.")
        }

        setStep(3)
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

  const isLastStep = step === 2
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
            href="/"
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
                <p>1. Choose your partner model, fill in your details, and sign the agreement.</p>
                <p>2. Finanshels reviews the application and verifies the onboarding details.</p>
                <p>3. Once approved, the workspace unlocks immediately.</p>
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
              <Step1ModelAndDetails
                formData={formData}
                onChange={handleChange}
                lockedContact={lockedContact}
                lockedEmail={lockedEmail}
              />
            ) : null}

            {step === 2 ? (
              <Step3Terms
                formData={formData}
                onToggle={() => handleChange("agreedToTerms", !formData.agreedToTerms)}
                onChange={handleChange}
                partnerType={formData.type}
                contactName={lockedContact}
                contactEmail={lockedEmail}
              />
            ) : null}

            {step === 3 ? (
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

            {step < 3 ? (
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
