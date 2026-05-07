"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Pencil, X, Save, Loader2 } from "lucide-react"
import { COUNTRY_OPTIONS, NATIONALITY_OPTIONS, PARTNER_INDUSTRY_OPTIONS } from "@repo/types"
import { AdminPartnerDocumentUpload } from "@/components/admin-partner-document-upload"

/* ── Types ────────────────────────────────────────────── */

interface PartnerData {
  id: string
  // Admin-managed primary
  type: string
  companyName: string
  firstName: string | null
  lastName: string | null
  email: string
  phone: string | null
  designation: string | null
  partnershipManager: string | null
  appointmentsSetter: string | null
  /** team_members.id */
  sdrTeamMemberId: string | null
  /** team_members.id */
  partnershipManagerTeamMemberId: string | null
  partnersId: string | null
  strategicFunnelStage: string | null
  activationDate: string | null
  lastMetOn: string | null
  meetingScheduledDateAS: string | null
  // Admin-managed secondary
  partnershipLevel: string | null
  tier: string | null
  agreementStartDate: string | null
  agreementEndDate: string | null
  salesTrainingDone: boolean | null
  linkedinId: string | null
  website: string | null
  nationality: string | null
  businessSize: string | null
  partnerIndustry: string | null
  overview: string | null
  partnerAddress: string | null
  dateOfBirth: string | null
  secondaryEmail: string | null
  emailOptOut: boolean | null
  // Financial
  commissionType: string | null
  commissionRate: string | null
  vatRegistered: boolean | null
  vatNumber: string | null
  tradeLicense: string | null
  emirateIdPassport: string | null
  beneficiaryName: string | null
  bankName: string | null
  bankCountry: string | null
  accountNoIban: string | null
  swiftBicCode: string | null
  paymentFrequency: string | null
  /** Proposal / pricing attribution (unique per tenant) */
  promoCode: string | null
}

function toDateInputValue(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return ""
  const t = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  return ""
}

/* ── Field components ─────────────────────────────────── */

function TextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
      />
    </div>
  )
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  options: { label: string; value: string }[]
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
      >
        <option value="">{placeholder ?? "Select…"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function CheckboxField({
  label,
  name,
  checked,
  onChange,
}: {
  label: string
  name: string
  checked: boolean
  onChange: (name: string, value: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(name, e.target.checked)}
        className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
      />
      <span className="text-sm text-zinc-200">{label}</span>
    </label>
  )
}

function TextareaField({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  placeholder?: string
}) {
  return (
    <div className="sm:col-span-2">
      <label className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
      />
    </div>
  )
}

/* ── Section edit toggle ──────────────────────────────── */

function SectionEditButton({
  editing,
  onToggle,
}: {
  editing: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        editing
          ? "bg-zinc-700 text-zinc-300 hover:text-white"
          : "bg-white/6 text-slate-400 hover:text-white hover:bg-white/10"
      }`}
    >
      {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
      {editing ? "Cancel" : "Edit"}
    </button>
  )
}

/* ── Main form ────────────────────────────────────────── */

interface AdminPartnerEditFormProps {
  section: "primary" | "secondary" | "financial"
  title: React.ReactNode
  partner: PartnerData
  children: React.ReactNode
  /** When set, primary section uses roster picklists instead of free-text PM/AS. */
  teamPicklists?: {
    sdr: { label: string; value: string }[]
    pm: { label: string; value: string }[]
  }
}

export function AdminPartnerEditForm({
  section,
  title,
  partner,
  children,
  teamPicklists,
}: AdminPartnerEditFormProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string | boolean>>({})

  const handleChange = (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({})
    setError(null)
  }

  const handleSave = async () => {
    setError(null)

    const payload: Record<string, string | boolean | null> = {}
    for (const [key, val] of Object.entries(formData)) {
      if (typeof val === "string" && val === "") {
        payload[key] = null
      } else {
        payload[key] = val
      }
    }

    if (Object.keys(payload).length === 0) {
      setIsEditing(false)
      return
    }

    try {
      const res = await fetch(`/api/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to save changes.")
        return
      }

      setIsEditing(false)
      setFormData({})
      startTransition(() => router.refresh())
    } catch {
      setError("Network error. Please try again.")
    }
  }

  const val = (key: keyof PartnerData): string => {
    if (key in formData) return String(formData[key] ?? "")
    const raw = partner[key]
    if (raw === null || raw === undefined) return ""
    return String(raw)
  }

  const dateOfBirthInput = (): string => {
    if ("dateOfBirth" in formData) return String(formData.dateOfBirth ?? "")
    return toDateInputValue(partner.dateOfBirth)
  }

  const boolVal = (key: keyof PartnerData): boolean => {
    if (key in formData) return Boolean(formData[key])
    return Boolean(partner[key])
  }

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          {title}
          <SectionEditButton editing={false} onToggle={() => setIsEditing(true)} />
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          {title}
          <p className="text-xs text-indigo-400 font-medium">Editing — make changes below</p>
        </div>
        <div className="flex items-center gap-2">
          <SectionEditButton editing onToggle={handleCancel} />
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {section === "primary" && (
          <>
            <TextField
              label="Company name"
              name="companyName"
              value={val("companyName")}
              onChange={handleChange}
              placeholder="Registered company name"
            />
            <TextField
              label="First name"
              name="firstName"
              value={val("firstName")}
              onChange={handleChange}
              placeholder="Primary contact first name"
            />
            <TextField
              label="Last name"
              name="lastName"
              value={val("lastName")}
              onChange={handleChange}
              placeholder="Primary contact last name"
            />
            <SelectField
              label="Partner type"
              name="type"
              value={val("type")}
              onChange={handleChange}
              options={[
                { label: "Referral", value: "referral" },
                { label: "Channel", value: "channel" },
              ]}
            />
            <TextField
              label="Phone"
              name="phone"
              value={val("phone")}
              onChange={handleChange}
              placeholder="+971…"
            />
            <TextField
              label="Designation"
              name="designation"
              value={val("designation")}
              onChange={handleChange}
              placeholder="e.g. Managing Partner"
            />
            <div>
              <label className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1.5">
                Proposal promo code
              </label>
              <input
                type="text"
                name="promoCode"
                value={val("promoCode")}
                maxLength={6}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) =>
                  handleChange(
                    "promoCode",
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
                  )
                }
                placeholder="e.g. PHG239"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors uppercase tracking-wide"
              />
              <p className="mt-1.5 text-[11px] text-slate-500 leading-snug">
                3–6 characters for the pricing engine. Avoid I, L, O, and digits 0/1 for clarity.
                Leave blank while pending; approved partners cannot clear this field.
              </p>
            </div>
            {teamPicklists ? (
              <>
                <SelectField
                  label="Partnership manager (assigned)"
                  name="partnershipManagerTeamMemberId"
                  value={val("partnershipManagerTeamMemberId")}
                  onChange={handleChange}
                  options={teamPicklists.pm}
                  placeholder="Select partnership manager…"
                />
                <SelectField
                  label="Partnership executive (assigned)"
                  name="sdrTeamMemberId"
                  value={val("sdrTeamMemberId")}
                  onChange={handleChange}
                  options={teamPicklists.sdr}
                  placeholder="Select partnership executive…"
                />
              </>
            ) : (
              <>
                <TextField
                  label="Partnership manager"
                  name="partnershipManager"
                  value={val("partnershipManager")}
                  onChange={handleChange}
                  placeholder="Name or CRM owner"
                />
                <TextField
                  label="Partnership executive"
                  name="appointmentsSetter"
                  value={val("appointmentsSetter")}
                  onChange={handleChange}
                  placeholder="Partnership executive name"
                />
              </>
            )}
            <TextField
              label="Partners ID"
              name="partnersId"
              value={val("partnersId")}
              onChange={handleChange}
              placeholder="Internal partner reference"
            />
            <SelectField
              label="Strategic funnel stage"
              name="strategicFunnelStage"
              value={val("strategicFunnelStage")}
              onChange={handleChange}
              options={[
                { label: "New", value: "new" },
                { label: "Engaged", value: "engaged" },
                { label: "Qualified", value: "qualified" },
                { label: "Active", value: "active" },
                { label: "Dormant", value: "dormant" },
              ]}
            />
            <TextField
              label="Activation date"
              name="activationDate"
              value={val("activationDate")}
              onChange={handleChange}
              type="date"
            />
            <TextField
              label="Last met on"
              name="lastMetOn"
              value={val("lastMetOn")}
              onChange={handleChange}
              type="date"
            />
            <TextField
              label="Meeting scheduled"
              name="meetingScheduledDateAS"
              value={val("meetingScheduledDateAS")}
              onChange={handleChange}
              type="date"
            />
          </>
        )}

        {section === "secondary" && (
          <>
            <SelectField
              label="Partnership level"
              name="partnershipLevel"
              value={val("partnershipLevel")}
              onChange={handleChange}
              options={[
                { label: "Bronze", value: "bronze" },
                { label: "Silver", value: "silver" },
                { label: "Gold", value: "gold" },
                { label: "Platinum", value: "platinum" },
              ]}
            />
            <SelectField
              label="Tier"
              name="tier"
              value={val("tier")}
              onChange={handleChange}
              options={[
                { label: "Bronze", value: "bronze" },
                { label: "Silver", value: "silver" },
                { label: "Gold", value: "gold" },
                { label: "Platinum", value: "platinum" },
              ]}
            />
            <TextField
              label="Agreement start date"
              name="agreementStartDate"
              value={val("agreementStartDate")}
              onChange={handleChange}
              type="date"
            />
            <TextField
              label="Agreement end date"
              name="agreementEndDate"
              value={val("agreementEndDate")}
              onChange={handleChange}
              type="date"
            />
            <CheckboxField label="Sales training done" name="salesTrainingDone" checked={boolVal("salesTrainingDone")} onChange={handleChange} />
            <CheckboxField label="Email opt out" name="emailOptOut" checked={boolVal("emailOptOut")} onChange={handleChange} />
            <TextField
              label="LinkedIn ID"
              name="linkedinId"
              value={val("linkedinId")}
              onChange={handleChange}
              placeholder="Profile URL or handle"
            />
            <TextField label="Website" name="website" value={val("website")} onChange={handleChange} type="url" placeholder="https://…" />
            <SelectField
              label="Nationality"
              name="nationality"
              value={val("nationality")}
              onChange={handleChange}
              options={[...NATIONALITY_OPTIONS].map((n) => ({ label: n, value: n }))}
              placeholder="Select nationality"
            />
            <SelectField
              label="Business size"
              name="businessSize"
              value={val("businessSize")}
              onChange={handleChange}
              options={[
                { label: "Solo", value: "solo" },
                { label: "Small (2–10)", value: "small" },
                { label: "Medium (11–50)", value: "medium" },
                { label: "Large (50+)", value: "large" },
              ]}
            />
            <SelectField
              label="Partner industry"
              name="partnerIndustry"
              value={val("partnerIndustry")}
              onChange={handleChange}
              options={[...PARTNER_INDUSTRY_OPTIONS].map((n) => ({ label: n, value: n }))}
              placeholder="Select industry"
            />
            <TextField
              label="Address"
              name="partnerAddress"
              value={val("partnerAddress")}
              onChange={handleChange}
              placeholder="Street, city, country"
            />
            <TextField
              label="Date of birth"
              name="dateOfBirth"
              value={dateOfBirthInput()}
              onChange={handleChange}
              type="date"
            />
            <TextField
              label="Secondary email"
              name="secondaryEmail"
              value={val("secondaryEmail")}
              onChange={handleChange}
              type="email"
              placeholder="name@company.com"
            />
            <TextareaField label="Overview / Bio" name="overview" value={val("overview")} onChange={handleChange} placeholder="Partner description…" />
          </>
        )}

        {section === "financial" && (
          <>
            <SelectField
              label="Commission type"
              name="commissionType"
              value={val("commissionType")}
              onChange={handleChange}
              options={[
                { label: "Flat", value: "flat" },
                { label: "Percentage", value: "percentage" },
                { label: "Tiered", value: "tiered" },
              ]}
            />
            <TextField
              label="Commission rate (%)"
              name="commissionRate"
              value={val("commissionRate")}
              onChange={handleChange}
              placeholder="e.g. 15"
            />
            <CheckboxField label="VAT registered" name="vatRegistered" checked={boolVal("vatRegistered")} onChange={handleChange} />
            <TextField
              label="VAT number"
              name="vatNumber"
              value={val("vatNumber")}
              onChange={handleChange}
              placeholder="Tax registration number"
            />
            <TextField
              label="Trade license (number / ref)"
              name="tradeLicense"
              value={val("tradeLicense")}
              onChange={handleChange}
              placeholder="Trade license number"
            />
            <TextField
              label="Emirate ID / Passport (number / ref)"
              name="emirateIdPassport"
              value={val("emirateIdPassport")}
              onChange={handleChange}
              placeholder="ID or passport number"
            />
            <TextField
              label="Beneficiary name"
              name="beneficiaryName"
              value={val("beneficiaryName")}
              onChange={handleChange}
              placeholder="Name on bank account"
            />
            <TextField
              label="Bank name"
              name="bankName"
              value={val("bankName")}
              onChange={handleChange}
              placeholder="e.g. Emirates NBD"
            />
            <SelectField
              label="Bank country"
              name="bankCountry"
              value={val("bankCountry")}
              onChange={handleChange}
              options={[...COUNTRY_OPTIONS].map((n) => ({ label: n, value: n }))}
              placeholder="Select bank country"
            />
            <TextField
              label="Account No / IBAN"
              name="accountNoIban"
              value={val("accountNoIban")}
              onChange={handleChange}
              placeholder="AE00 0000 0000 0000 0000 000"
            />
            <TextField
              label="SWIFT / BIC code"
              name="swiftBicCode"
              value={val("swiftBicCode")}
              onChange={handleChange}
              placeholder="BANKAEAD"
            />
            <SelectField
              label="Payment frequency"
              name="paymentFrequency"
              value={val("paymentFrequency")}
              onChange={handleChange}
              options={[
                { label: "Monthly", value: "monthly" },
                { label: "Bi-weekly", value: "bi-weekly" },
                { label: "Quarterly", value: "quarterly" },
                { label: "On request", value: "on-request" },
              ]}
            />
            <div className="sm:col-span-2 border-t border-zinc-800 pt-4 mt-1 space-y-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Upload documents
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <AdminPartnerDocumentUpload
                  partnerId={partner.id}
                  label="Trade license file"
                  documentType="trade_license"
                />
                <AdminPartnerDocumentUpload
                  partnerId={partner.id}
                  label="Emirates ID file"
                  documentType="emirates_id"
                />
                <AdminPartnerDocumentUpload
                  partnerId={partner.id}
                  label="Passport file"
                  documentType="passport"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
