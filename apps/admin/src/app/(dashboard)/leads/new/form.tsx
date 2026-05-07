"use client"

import { useState } from "react"
import type { ChangeEvent, FormEvent, ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"

type LeadType = "new" | "existing"

interface Props {
  partners: { id: string; companyName: string }[]
  services: { id: string; name: string; category: string }[]
  leadCatalog: { name: string; code: string }[]
  wonLeads: {
    id: string
    partnerId: string
    customerName: string
    customerEmail: string
    customerCompany: string | null
  }[]
  teamMembers: { authUserId: string; name: string }[]
}

export function NewLeadForm({ partners, services, leadCatalog, wonLeads, teamMembers }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [duplicate, setDuplicate] = useState<{ id: string } | null>(null)
  const [leadType, setLeadType] = useState<LeadType>(
    searchParams.get("leadType") === "existing" ? "existing" : "new",
  )
  const [form, setForm] = useState({
    partnerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCompany: "",
    serviceInterest: [] as string[],
    notes: "",
    existingLeadId: "",
    serviceId: "",
    pricing: "",
    startDate: "",
    endDate: "",
    assignedTo: "",
    onBehalfNote: "",
  })

  const set =
    (k: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  function toggleService(name: string) {
    setForm((f) => ({
      ...f,
      serviceInterest: f.serviceInterest.includes(name)
        ? f.serviceInterest.filter((service) => service !== name)
        : [...f.serviceInterest, name],
    }))
  }

  const availableWonLeads = form.partnerId
    ? wonLeads.filter((lead) => lead.partnerId === form.partnerId)
    : wonLeads

  const selectedWonLead = wonLeads.find((lead) => lead.id === form.existingLeadId) ?? null

  function onSelectWonLead(e: ChangeEvent<HTMLSelectElement>) {
    const selectedLeadId = e.target.value
    const selected = wonLeads.find((lead) => lead.id === selectedLeadId) ?? null
    setForm((f) => ({
      ...f,
      existingLeadId: selectedLeadId,
      partnerId: selected?.partnerId ?? f.partnerId,
      customerName: selected?.customerName ?? f.customerName,
      customerEmail: selected?.customerEmail ?? f.customerEmail,
      customerCompany: selected?.customerCompany ?? f.customerCompany,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setDuplicate(null)
    setSaving(true)
    try {
      if (leadType === "existing") {
        const res = await fetch("/api/admin/service-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partnerId: form.partnerId,
            serviceId: form.serviceId,
            leadId: form.existingLeadId,
            customerCompany: form.customerCompany,
            customerContact: form.customerName,
            customerEmail: form.customerEmail,
            pricing: form.pricing ? Number(form.pricing) : undefined,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            assignedTo: form.assignedTo || undefined,
            notes: form.notes || undefined,
            onBehalfNote: form.onBehalfNote,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? "Failed to create existing-client referral")
        toast.success("Existing-client lead created")
        router.push(`/leads/${data.id}`)
        return
      }

      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: form.partnerId,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          customerCompany: form.customerCompany,
          serviceInterest: form.serviceInterest,
          notes: form.notes,
        }),
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
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">New Lead</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            One unified intake for new leads and existing closed clients.
          </p>
        </div>
      </div>

      <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
        <button
          type="button"
          onClick={() => setLeadType("new")}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            leadType === "new" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          New lead
        </button>
        <button
          type="button"
          onClick={() => setLeadType("existing")}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            leadType === "existing" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Existing closed client
        </button>
      </div>

      {duplicate && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-800/40 bg-yellow-950/40 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
          <div>
            <p className="font-medium text-yellow-300">Duplicate detected</p>
            <p className="mt-0.5 text-xs text-yellow-500">
              A lead with this email or phone already exists for this partner.{" "}
              <Link href={`/leads/${duplicate.id}`} className="underline hover:text-yellow-300">
                View existing lead
              </Link>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-zinc-100">Partner</h2>
          <Field label="Partner *">
            <select required value={form.partnerId} onChange={set("partnerId")} className={selectCls}>
              <option value="">Select partner…</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.companyName}
                </option>
              ))}
            </select>
          </Field>
        </section>

        {leadType === "existing" ? (
          <>
            <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">Existing Closed Client</h2>
              <Field label="Won Lead *">
                <select
                  required
                  value={form.existingLeadId}
                  onChange={onSelectWonLead}
                  className={selectCls}
                >
                  <option value="">Select closed client…</option>
                  {availableWonLeads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.customerName}
                      {lead.customerCompany ? ` · ${lead.customerCompany}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {!selectedWonLead ? (
                <p className="text-xs text-zinc-500">
                  Only leads with status deal won can be used for existing-client referrals.
                </p>
              ) : null}
            </section>

            <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">Service Request Details</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Service *">
                  <select required value={form.serviceId} onChange={set("serviceId")} className={selectCls}>
                    <option value="">Select service…</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
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
                <Field label="Start Date">
                  <input type="date" value={form.startDate} onChange={set("startDate")} className={inputCls} />
                </Field>
                <Field label="End Date (SLA)">
                  <input type="date" value={form.endDate} onChange={set("endDate")} className={inputCls} />
                </Field>
                <Field label="Assign To">
                  <select value={form.assignedTo} onChange={set("assignedTo")} className={selectCls}>
                    <option value="">Unassigned</option>
                    {teamMembers.map((member) => (
                      <option key={member.authUserId} value={member.authUserId}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Customer Email *">
                  <input
                    required
                    type="email"
                    value={form.customerEmail}
                    onChange={set("customerEmail")}
                    placeholder="jane@company.com"
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Customer Contact *">
                  <input
                    required
                    value={form.customerName}
                    onChange={set("customerName")}
                    placeholder="Jane Smith"
                    className={inputCls}
                  />
                </Field>
                <Field label="Customer Company *">
                  <input
                    required
                    value={form.customerCompany}
                    onChange={set("customerCompany")}
                    placeholder="Acme Ltd"
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="On-Behalf Note *">
                <textarea
                  required
                  value={form.onBehalfNote}
                  onChange={set("onBehalfNote")}
                  rows={2}
                  placeholder="Reason admin is creating this on behalf of the partner…"
                  className={inputCls + " resize-none border-yellow-800/40 focus:border-yellow-500"}
                />
              </Field>
              <Field label="Internal Notes">
                <textarea
                  value={form.notes}
                  onChange={set("notes")}
                  rows={3}
                  placeholder="Background context…"
                  className={inputCls + " resize-none"}
                />
              </Field>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">Customer Details</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Customer Name *">
                  <input
                    required
                    value={form.customerName}
                    onChange={set("customerName")}
                    placeholder="John Doe"
                    className={inputCls}
                  />
                </Field>
                <Field label="Customer Email *">
                  <input
                    required
                    type="email"
                    value={form.customerEmail}
                    onChange={set("customerEmail")}
                    placeholder="john@company.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={form.customerPhone}
                    onChange={set("customerPhone")}
                    placeholder="+971 50 000 0000"
                    className={inputCls}
                  />
                </Field>
                <Field label="Company">
                  <input
                    value={form.customerCompany}
                    onChange={set("customerCompany")}
                    placeholder="Acme Ltd"
                    className={inputCls}
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">Service list</h2>
              <p className="text-xs text-zinc-500">Select all services the lead is interested in.</p>
              <div className="flex flex-wrap gap-2">
                {leadCatalog.map(({ name, code }) => {
                  const active = form.serviceInterest.includes(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      title={code ? `Code: ${code}` : undefined}
                      onClick={() => toggleService(name)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-indigo-600/50 bg-indigo-600/20 text-indigo-300"
                          : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">Notes</h2>
              <Field label="Internal Notes">
                <textarea
                  value={form.notes}
                  onChange={set("notes")}
                  rows={3}
                  placeholder="Background context…"
                  className={inputCls + " resize-none"}
                />
              </Field>
            </section>
          </>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/leads" className="px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving
              ? "Creating…"
              : leadType === "existing"
                ? "Create Existing-Client Referral"
                : "Create Lead"}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none"

const selectCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 transition-colors focus:border-indigo-500 focus:outline-none"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  )
}
