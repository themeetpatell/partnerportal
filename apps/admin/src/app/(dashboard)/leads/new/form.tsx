"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"

const SOURCES = ["manual", "website", "referral", "campaign"] as const
const CHANNELS = ["manual", "website", "referral", "campaign"] as const

interface Props {
  partners: { id: string; companyName: string }[]
  teamMembers: { clerkUserId: string; name: string }[]
  services: { id: string; name: string }[]
}

export function NewLeadForm({ partners, teamMembers, services }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [duplicate, setDuplicate] = useState<{ id: string } | null>(null)
  const [form, setForm] = useState({
    partnerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCompany: "",
    serviceInterest: [] as string[],
    notes: "",
    source: "manual" as (typeof SOURCES)[number],
    channel: "manual",
    region: "",
    country: "",
    city: "",
    assignedTo: "",
    onBehalfNote: "",
  })

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  function toggleService(id: string) {
    setForm((f) => ({
      ...f,
      serviceInterest: f.serviceInterest.includes(id)
        ? f.serviceInterest.filter((s) => s !== id)
        : [...f.serviceInterest, id],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setDuplicate(null)
    setSaving(true)
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.status === 409) {
        setDuplicate({ id: data.duplicateId })
        return
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to create lead")
      toast.success("Lead created")
      router.push(`/leads/${data.id}`)
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
          href="/leads"
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">New Lead</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Create a lead on behalf of a partner. A note is required.
          </p>
        </div>
      </div>

      {duplicate && (
        <div className="flex items-start gap-3 p-4 bg-yellow-950/40 border border-yellow-800/40 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-300 font-medium">Duplicate detected</p>
            <p className="text-yellow-500 text-xs mt-0.5">
              A lead with this email or phone already exists for this partner.{" "}
              <Link href={`/leads/${duplicate.id}`} className="underline hover:text-yellow-300">
                View existing lead
              </Link>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Partner */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Partner</h2>
          <Field label="Partner *">
            <select required value={form.partnerId} onChange={set("partnerId")} className={selectCls}>
              <option value="">Select partner…</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.companyName}</option>
              ))}
            </select>
          </Field>
        </section>

        {/* Customer */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Customer Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Customer Name *">
              <input required value={form.customerName} onChange={set("customerName")} placeholder="John Doe" className={inputCls} />
            </Field>
            <Field label="Customer Email *">
              <input required type="email" value={form.customerEmail} onChange={set("customerEmail")} placeholder="john@company.com" className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={form.customerPhone} onChange={set("customerPhone")} placeholder="+971 50 000 0000" className={inputCls} />
            </Field>
            <Field label="Company">
              <input value={form.customerCompany} onChange={set("customerCompany")} placeholder="Acme Ltd" className={inputCls} />
            </Field>
          </div>
        </section>

        {/* Services */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Service Interest</h2>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => {
              const active = form.serviceInterest.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? "bg-indigo-600/20 border-indigo-600/50 text-indigo-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {s.name}
                </button>
              )
            })}
          </div>
        </section>

        {/* Attribution */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Attribution &amp; Assignment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Source">
              <select value={form.source} onChange={set("source")} className={selectCls}>
                {SOURCES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </Field>
            <Field label="Channel">
              <select value={form.channel} onChange={set("channel")} className={selectCls}>
                {CHANNELS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </Field>
            <Field label="Region">
              <input value={form.region} onChange={set("region")} placeholder="UAE" className={inputCls} />
            </Field>
            <Field label="Assign To">
              <select value={form.assignedTo} onChange={set("assignedTo")} className={selectCls}>
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.clerkUserId} value={m.clerkUserId}>{m.name}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Notes + mandatory on-behalf note */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Notes</h2>
          <Field label="Internal Notes">
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={3}
              placeholder="Background context…"
              className={inputCls + " resize-none"}
            />
          </Field>
          <Field label="On-Behalf Note * (mandatory — explain why admin is creating this)">
            <textarea
              required
              value={form.onBehalfNote}
              onChange={set("onBehalfNote")}
              rows={2}
              placeholder="e.g. Partner called in — requested manual entry while they don't have portal access"
              className={inputCls + " resize-none border-yellow-800/40 focus:border-yellow-500"}
            />
          </Field>
        </section>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/leads" className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? "Creating…" : "Create Lead"}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls =
  "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"

const selectCls =
  "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  )
}
