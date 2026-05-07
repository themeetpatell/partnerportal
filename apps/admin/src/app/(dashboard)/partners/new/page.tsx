"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { COUNTRY_OPTIONS, NATIONALITY_OPTIONS, PARTNER_INDUSTRY_OPTIONS } from "@repo/types"

const TYPES = ["referral", "channel"] as const
const TIERS = ["bronze", "silver", "gold", "platinum"] as const

export default function NewPartnerPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    type: "referral" as (typeof TYPES)[number],
    tier: "",
    designation: "",
    secondaryEmail: "",
    country: "",
    city: "",
    partnerAddress: "",
    website: "",
    linkedinId: "",
    nationality: "",
    businessSize: "",
    partnerIndustry: "",
    agreementUrl: "",
    sendActivationLink: true,
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const setCheckbox = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.checked }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to create partner")
      }
      const partner = await res.json()
      if (partner.activationLinkSent) {
        toast.success("Partner created and activation link sent")
      } else if (partner.activationLinkError) {
        toast.warning(`Partner created, but activation link failed: ${partner.activationLinkError}`)
      } else {
        toast.success("Partner created")
      }
      router.push(`/partners/${partner.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/partners"
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">New Partner</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Manually create a partner profile and optionally send a portal activation email.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company info */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Company Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company Name *">
              <input
                required
                value={form.companyName}
                onChange={set("companyName")}
                placeholder="Acme Corp"
                className={inputCls}
              />
            </Field>
            <Field label="Contact Name *">
              <input
                required
                value={form.contactName}
                onChange={set("contactName")}
                placeholder="Jane Smith"
                className={inputCls}
              />
            </Field>
            <Field label="Email *">
              <input
                required
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="jane@acme.com"
                className={inputCls}
              />
            </Field>
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={set("phone")}
                placeholder="+971 50 000 0000"
                className={inputCls}
              />
            </Field>
            <Field label="Designation">
              <input
                value={form.designation}
                onChange={set("designation")}
                placeholder="Managing Partner"
                className={inputCls}
              />
            </Field>
            <Field label="Secondary Email">
              <input
                type="email"
                value={form.secondaryEmail}
                onChange={set("secondaryEmail")}
                placeholder="ops@acme.com"
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        {/* Classification */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Classification</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Partner Type *">
              <select value={form.type} onChange={set("type")} className={selectCls}>
                {TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tier">
              <select value={form.tier} onChange={set("tier")} className={selectCls}>
                <option value="">— None —</option>
                {TIERS.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Business Size">
              <select value={form.businessSize} onChange={set("businessSize")} className={selectCls}>
                <option value="">— Select size —</option>
                <option value="solo">Solo</option>
                <option value="small">Small (2-10)</option>
                <option value="medium">Medium (11-50)</option>
                <option value="large">Large (50+)</option>
              </select>
            </Field>
            <Field label="Industry">
              <select value={form.partnerIndustry} onChange={set("partnerIndustry")} className={selectCls}>
                <option value="">— Select industry —</option>
                {PARTNER_INDUSTRY_OPTIONS.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Location */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Country">
              <select value={form.country} onChange={set("country")} className={selectCls}>
                <option value="">— Select country —</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="City">
              <input value={form.city} onChange={set("city")} placeholder="Dubai" className={inputCls} />
            </Field>
            <Field label="Nationality">
              <select value={form.nationality} onChange={set("nationality")} className={selectCls}>
                <option value="">— Select nationality —</option>
                {NATIONALITY_OPTIONS.map((nationality) => (
                  <option key={nationality} value={nationality}>
                    {nationality}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Registered Address">
            <textarea
              value={form.partnerAddress}
              onChange={set("partnerAddress")}
              placeholder="Street, city, country"
              className={textareaCls}
              rows={3}
            />
          </Field>
        </section>

        {/* Partner portal profile */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Partner Portal Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Website">
              <input
                type="url"
                value={form.website}
                onChange={set("website")}
                placeholder="https://acme.com"
                className={inputCls}
              />
            </Field>
            <Field label="LinkedIn ID">
              <input
                value={form.linkedinId}
                onChange={set("linkedinId")}
                placeholder="linkedin.com/in/jane-smith"
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        {/* Agreement */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Agreement</h2>
          <Field label="Agreement URL">
            <input
              type="url"
              value={form.agreementUrl}
              onChange={set("agreementUrl")}
              placeholder="https://drive.google.com/…"
              className={inputCls}
            />
          </Field>
          <label className="flex items-center gap-2.5 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.sendActivationLink}
              onChange={setCheckbox("sendActivationLink")}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
            />
            Send partner portal activation link now
          </label>
        </section>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/partners"
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving
              ? form.sendActivationLink
                ? "Creating & sending…"
                : "Creating…"
              : form.sendActivationLink
                ? "Create & Send Activation"
                : "Create Partner"}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls =
  "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"

const selectCls =
  "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors capitalize"

const textareaCls =
  "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  )
}
