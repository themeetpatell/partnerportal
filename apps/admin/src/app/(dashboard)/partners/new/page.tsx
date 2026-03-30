"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const TYPES = ["referral", "channel"] as const
const TIERS = ["bronze", "silver", "gold", "platinum"] as const
const CHANNELS = ["manual", "website", "referral", "campaign"] as const
const STATUSES = ["draft", "pending", "approved"] as const

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
    region: "",
    country: "",
    city: "",
    channel: "manual",
    status: "draft" as (typeof STATUSES)[number],
    agreementUrl: "",
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

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
      toast.success("Partner created")
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
            Manually create a partner profile. An invite can be sent later.
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
            <Field label="Channel">
              <select value={form.channel} onChange={set("channel")} className={selectCls}>
                {CHANNELS.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Initial Status">
              <select value={form.status} onChange={set("status")} className={selectCls}>
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
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
            <Field label="Region">
              <input value={form.region} onChange={set("region")} placeholder="UAE" className={inputCls} />
            </Field>
            <Field label="Country">
              <input value={form.country} onChange={set("country")} placeholder="United Arab Emirates" className={inputCls} />
            </Field>
            <Field label="City">
              <input value={form.city} onChange={set("city")} placeholder="Dubai" className={inputCls} />
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
            {saving ? "Creating…" : "Create Partner"}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  )
}
