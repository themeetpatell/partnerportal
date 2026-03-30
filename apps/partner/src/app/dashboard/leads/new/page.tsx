"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Mail, Phone, Send, UserRound } from "lucide-react"
import { toast } from "sonner"

const SERVICES = [
  "Tax Registration",
  "VAT Filing",
  "Bookkeeping",
  "Company Formation",
  "Audit & Assurance",
  "CFO Services",
]

type Lead = {
  id: string
  customerName: string
  customerEmail: string
  status: string
  createdAt: string
}

const statusStyles: Record<string, string> = {
  submitted: "border border-zinc-300/20 bg-zinc-300/10 text-zinc-100",
  in_review: "border border-zinc-400/20 bg-zinc-400/10 text-zinc-100",
  qualified: "border border-zinc-500/20 bg-zinc-500/10 text-zinc-100",
  proposal_sent: "border border-zinc-600/20 bg-zinc-600/10 text-zinc-100",
  converted: "border border-white/20 bg-white/10 text-white",
  rejected: "border border-zinc-700/20 bg-zinc-700/10 text-zinc-300",
}

export default function NewLeadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCompany: "",
    notes: "",
    serviceInterests: [] as string[],
  })

  useEffect(() => {
    fetch("/api/leads")
      .then((response) => response.json())
      .then((data) => {
        setRecentLeads((data.leads || []).slice().reverse().slice(0, 5))
        setLoadingRecent(false)
      })
      .catch(() => setLoadingRecent(false))
  }, [])

  function toggle(service: string) {
    setForm((current) => ({
      ...current,
      serviceInterests: current.serviceInterests.includes(service)
        ? current.serviceInterests.filter((item) => item !== service)
        : [...current.serviceInterests, service],
    }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      toast.success("Lead submitted.")
      setForm({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerCompany: "",
        notes: "",
        serviceInterests: [],
      })
      setRecentLeads((current) => [
        {
          id: data.lead.id,
          customerName: data.lead.customerName,
          customerEmail: data.lead.customerEmail,
          status: data.lead.status,
          createdAt: data.lead.createdAt,
        },
        ...current,
      ].slice(0, 5))
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-[2rem] p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="page-title">Submit a lead</h1>
            <p className="page-subtitle mt-3">
              Add the referral details and keep the recent submissions visible below.
            </p>
          </div>
          <Link href="/dashboard/clients" className="tag-pill">
            View clients
          </Link>
        </div>

        <form onSubmit={submit} className="form-shell mt-6 border-0 bg-transparent p-0 shadow-none">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                label: "Full name",
                key: "customerName",
                placeholder: "John Smith",
                type: "text",
                required: true,
                icon: UserRound,
              },
              {
                label: "Email",
                key: "customerEmail",
                placeholder: "john@example.com",
                type: "email",
                required: true,
                icon: Mail,
              },
              {
                label: "Phone",
                key: "customerPhone",
                placeholder: "+971 50 000 0000",
                type: "text",
                required: false,
                icon: Phone,
              },
              {
                label: "Company",
                key: "customerCompany",
                placeholder: "Acme LLC",
                type: "text",
                required: false,
                icon: Building2,
              },
            ].map((field) => (
              <div key={field.key}>
                <label className="field-label">
                  {field.label}
                  {field.required ? <span className="ml-1 text-rose-300">*</span> : null}
                </label>
                <div className="relative">
                  <field.icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    required={field.required}
                    type={field.type}
                    value={(form as Record<string, unknown>)[field.key] as string}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="field-input pl-11"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <label className="field-label">Services interested in</label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map((service) => {
                const active = form.serviceInterests.includes(service)

                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggle(service)}
                    className={`rounded-[1.15rem] border px-4 py-3 text-left text-sm font-medium transition-all ${
                      active
                        ? "border-indigo-400/30 bg-indigo-500/10 text-white"
                        : "border-white/8 bg-white/[0.03] text-slate-400 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {service}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-6">
            <label className="field-label">Notes</label>
            <textarea
              rows={5}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Key context, urgency, pricing signals, or anything the delivery team should know..."
              className="field-textarea"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary-button mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Send className="h-4 w-4" />
            {loading ? "Submitting..." : "Submit lead"}
          </button>
        </form>
      </section>

      <section className="table-shell">
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
          <div>
            <p className="font-heading text-xl font-semibold text-white">Previous leads</p>
            <p className="mt-1 text-sm text-slate-400">
              Your latest submissions stay visible while you add the next one.
            </p>
          </div>
          <Link href="/dashboard/clients" className="tag-pill">
            View all
          </Link>
        </div>

        {loadingRecent ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">Loading leads...</div>
        ) : recentLeads.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">
            No previous leads yet.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-slate-500">
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-white/6 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4 font-medium text-white">{lead.customerName}</td>
                      <td className="px-6 py-4 text-slate-300">{lead.customerEmail}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`status-pill ${statusStyles[lead.status] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                        >
                          {lead.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(lead.createdAt).toLocaleDateString("en-AE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 md:hidden">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg font-semibold text-white">
                        {lead.customerName}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">{lead.customerEmail}</p>
                    </div>
                    <span
                      className={`status-pill ${statusStyles[lead.status] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                    >
                      {lead.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {new Date(lead.createdAt).toLocaleDateString("en-AE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
