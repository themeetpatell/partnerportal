"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Props {
  partners: { id: string; companyName: string }[]
  services: { id: string; name: string; category: string }[]
  leads: { id: string; customerName: string; customerCompany: string | null; partnerId: string }[]
  teamMembers: { clerkUserId: string; name: string }[]
}

export function NewServiceRequestForm({ partners, services, leads, teamMembers }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    partnerId: "",
    serviceId: "",
    leadId: "",
    customerCompany: "",
    customerContact: "",
    customerEmail: "",
    pricing: "",
    startDate: "",
    endDate: "",
    assignedTo: "",
    notes: "",
    onBehalfNote: "",
  })

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  // When a lead is selected, pre-fill customer details
  function handleLeadSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const leadId = e.target.value
    const lead = leads.find((l) => l.id === leadId)
    setForm((f) => ({
      ...f,
      leadId,
      customerCompany: lead?.customerCompany ?? f.customerCompany,
      customerContact: lead?.customerName ?? f.customerContact,
      partnerId: lead?.partnerId ?? f.partnerId,
    }))
  }

  // Leads filtered to selected partner
  const filteredLeads = form.partnerId
    ? leads.filter((l) => l.partnerId === form.partnerId)
    : leads

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pricing: form.pricing ? Number(form.pricing) : undefined,
          leadId: form.leadId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create service request")
      toast.success("Service request created")
      router.push(`/service-requests/${data.id}`)
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
          href="/service-requests"
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">New Service Request</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Create a service request on behalf of a partner.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Partner + Lead link */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Partner &amp; Lead</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Partner *">
              <select required value={form.partnerId} onChange={set("partnerId")} className={selectCls}>
                <option value="">Select partner…</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.companyName}</option>
                ))}
              </select>
            </Field>
            <Field label="Linked Lead (optional)">
              <select value={form.leadId} onChange={handleLeadSelect} className={selectCls}>
                <option value="">— No lead —</option>
                {filteredLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.customerName}{l.customerCompany ? ` · ${l.customerCompany}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Service */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Service</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Service *">
              <select required value={form.serviceId} onChange={set("serviceId")} className={selectCls}>
                <option value="">Select service…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                ))}
              </select>
            </Field>
            <Field label="Pricing (AED)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.pricing}
                onChange={set("pricing")}
                placeholder="0.00"
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        {/* Customer */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Customer Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company *">
              <input required value={form.customerCompany} onChange={set("customerCompany")} placeholder="Acme Ltd" className={inputCls} />
            </Field>
            <Field label="Contact Name *">
              <input required value={form.customerContact} onChange={set("customerContact")} placeholder="Jane Smith" className={inputCls} />
            </Field>
            <Field label="Customer Email *">
              <input required type="email" value={form.customerEmail} onChange={set("customerEmail")} placeholder="jane@acme.com" className={inputCls} />
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

        {/* Timeline */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Timeline &amp; SLA</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Start Date">
              <input type="date" value={form.startDate} onChange={set("startDate")} className={inputCls} />
            </Field>
            <Field label="End Date (SLA)">
              <input type="date" value={form.endDate} onChange={set("endDate")} className={inputCls} />
            </Field>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Notes</h2>
          <Field label="Internal Notes">
            <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Background context…" className={inputCls + " resize-none"} />
          </Field>
          <Field label="On-Behalf Note * (mandatory)">
            <textarea
              required
              value={form.onBehalfNote}
              onChange={set("onBehalfNote")}
              rows={2}
              placeholder="Reason admin is creating this on behalf of the partner…"
              className={inputCls + " resize-none border-yellow-800/40 focus:border-yellow-500"}
            />
          </Field>
        </section>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/service-requests" className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? "Creating…" : "Create Service Request"}
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
