"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Pencil, X, Save, Loader2 } from "lucide-react"

/* ── Types ────────────────────────────────────────────── */

interface PartnerData {
  companyName: string
  contactName: string
  phone: string | null
  designation: string | null
  dateOfBirth: string | null
  secondaryEmail: string | null
  website: string | null
  linkedinId: string | null
  nationality: string | null
  businessSize: string | null
  partnerIndustry: string | null
  overview: string | null
  partnerAddress: string | null
  emailOptOut: boolean | null
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
}

/* ── Reusable field components ────────────────────────── */

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
      <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 block mb-1.5">
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
      <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 block mb-1.5">
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
      <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 block mb-1.5">
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

/* ── Section edit toggle button ───────────────────────── */

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
      className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:w-auto ${
        editing
          ? "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          : "bg-white/6 text-slate-400 hover:text-white hover:bg-white/10"
      }`}
    >
      {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
      {editing ? "Cancel" : "Edit"}
    </button>
  )
}

/* ── Main form component ──────────────────────────────── */

interface ProfileEditFormProps {
  section: "contact" | "company" | "financial"
  title: string
  description?: string
  partner: PartnerData
  children: React.ReactNode
}

export function ProfileEditForm({
  section,
  title,
  description,
  partner,
  children,
}: ProfileEditFormProps) {
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

    // Only send fields that were actually changed
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
      const res = await fetch("/api/profile", {
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

  const boolVal = (key: keyof PartnerData): boolean => {
    if (key in formData) return Boolean(formData[key])
    return Boolean(partner[key])
  }

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
            ) : null}
          </div>
          <div className="w-full sm:w-auto">
            <SectionEditButton editing={false} onToggle={() => setIsEditing(true)} />
          </div>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-1 text-xs font-medium text-indigo-400">Editing — make changes below</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <SectionEditButton editing onToggle={handleCancel} />
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 sm:w-auto"
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
        {section === "contact" && (
          <>
            <TextField label="Contact name" name="contactName" value={val("contactName")} onChange={handleChange} />
            <TextField label="Phone" name="phone" value={val("phone")} onChange={handleChange} />
            <TextField label="Designation" name="designation" value={val("designation")} onChange={handleChange} />
            <TextField label="Date of birth" name="dateOfBirth" value={val("dateOfBirth")} onChange={handleChange} placeholder="e.g. 1990-01-15" />
            <TextField label="Secondary email" name="secondaryEmail" value={val("secondaryEmail")} onChange={handleChange} type="email" />
            <TextField label="Website" name="website" value={val("website")} onChange={handleChange} type="url" placeholder="https://…" />
            <TextField label="LinkedIn ID" name="linkedinId" value={val("linkedinId")} onChange={handleChange} />
            <TextField label="Nationality" name="nationality" value={val("nationality")} onChange={handleChange} />
            <TextField label="Registered address" name="partnerAddress" value={val("partnerAddress")} onChange={handleChange} placeholder="e.g. Unit 301, Business Bay, Dubai, UAE" />
          </>
        )}

        {section === "company" && (
          <>
            <TextField label="Company name" name="companyName" value={val("companyName")} onChange={handleChange} />
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
            <TextField label="Industry" name="partnerIndustry" value={val("partnerIndustry")} onChange={handleChange} />
            <TextareaField label="Overview / Bio" name="overview" value={val("overview")} onChange={handleChange} placeholder="Brief description of your business…" />
          </>
        )}

        {section === "financial" && (
          <>
            <CheckboxField label="VAT registered" name="vatRegistered" checked={boolVal("vatRegistered")} onChange={handleChange} />
            <TextField label="VAT number" name="vatNumber" value={val("vatNumber")} onChange={handleChange} />
            <TextField label="Trade license" name="tradeLicense" value={val("tradeLicense")} onChange={handleChange} />
            <TextField label="Emirate ID / Passport" name="emirateIdPassport" value={val("emirateIdPassport")} onChange={handleChange} />
            <TextField label="Beneficiary name (as per bank)" name="beneficiaryName" value={val("beneficiaryName")} onChange={handleChange} />
            <TextField label="Bank name" name="bankName" value={val("bankName")} onChange={handleChange} />
            <TextField label="Bank country" name="bankCountry" value={val("bankCountry")} onChange={handleChange} />
            <TextField label="Account No / IBAN" name="accountNoIban" value={val("accountNoIban")} onChange={handleChange} />
            <TextField label="SWIFT / BIC code" name="swiftBicCode" value={val("swiftBicCode")} onChange={handleChange} />
          </>
        )}
      </div>
    </div>
  )
}
