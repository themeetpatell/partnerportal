"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Mail, UserRound, Wrench } from "lucide-react"
import { toast } from "sonner"
import { ZOHO_LEAD_SERVICE_PICKLIST_VALUES } from "@repo/zoho"

type ServiceRequest = {
  id: string
  customerCompany: string
  customerContact: string
  customerEmail: string
  serviceName: string
  status: string
  createdAt: string
}

type EligibleClient = {
  leadId: string
  companyName: string
  contactName: string
  email: string
  wonAt: string | null
}

const statusStyles: Record<string, string> = {
  pending: "border border-zinc-300/20 bg-zinc-300/10 text-zinc-100",
  in_progress: "border border-zinc-400/20 bg-zinc-400/10 text-zinc-100",
  completed: "border border-white/20 bg-white/10 text-white",
  cancelled: "border border-zinc-600/20 bg-zinc-500/10 text-zinc-300",
}

export default function NewServiceRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [eligibleClients, setEligibleClients] = useState<EligibleClient[]>([])
  const [form, setForm] = useState({
    leadId: "",
    serviceInterest: [] as string[],
    description: "",
  })

  useEffect(() => {
    Promise.all([
      fetch("/api/service-requests"),
      fetch("/api/service-requests/options"),
    ])
      .then(async ([requestsResponse, optionsResponse]) => {
        const requestsData = await requestsResponse.json().catch(() => ({}))
        const optionsData = await optionsResponse.json().catch(() => ({}))
        setRecentRequests((requestsData.serviceRequests || []).slice().reverse().slice(0, 5))
        setEligibleClients(optionsData.clients || [])
      })
      .catch(() => {
        toast.error("Unable to load options right now.")
      })
      .finally(() => {
        setLoadingRecent(false)
        setLoadingOptions(false)
      })
  }, [])

  const selectedClient =
    eligibleClients.find((client) => client.leadId === form.leadId) ?? null

  const canSubmit =
    !loading &&
    Boolean(form.leadId) &&
    form.serviceInterest.length > 0 &&
    eligibleClients.length > 0

  function toggleService(service: string) {
    setForm((current) => ({
      ...current,
      serviceInterest: current.serviceInterest.includes(service)
        ? current.serviceInterest.filter((s) => s !== service)
        : [...current.serviceInterest, service],
    }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || "Failed to create service request.")
      }

      toast.success("Request submitted.")
      setForm({ leadId: "", serviceInterest: [], description: "" })
      setRecentRequests((current) =>
        [
          {
            id: data.serviceRequest.id,
            customerCompany: data.serviceRequest.customerCompany,
            customerContact: data.serviceRequest.customerContact,
            customerEmail: data.serviceRequest.customerEmail,
            serviceName: data.serviceRequest.serviceName,
            status: data.serviceRequest.status,
            createdAt: data.serviceRequest.createdAt,
          },
          ...current,
        ].slice(0, 5)
      )
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-[2rem] p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="page-title">New service request</h1>
            <p className="page-subtitle mt-3">
              Select an existing won client and choose the services to cross-sell or upsell.
            </p>
          </div>
          <Link href="/dashboard/service-requests" className="tag-pill">
            View all requests
          </Link>
        </div>

        <form onSubmit={submit} className="form-shell mt-6 border-0 bg-transparent p-0 shadow-none">
          {/* Client selector */}
          <div>
            <label className="field-label">
              Existing client <span className="ml-1 text-rose-300">*</span>
            </label>
            <select
              required
              value={form.leadId}
              onChange={(event) =>
                setForm((current) => ({ ...current, leadId: event.target.value }))
              }
              className="field-select"
              disabled={loadingOptions || eligibleClients.length === 0}
            >
              <option value="">
                {loadingOptions
                  ? "Loading won clients..."
                  : eligibleClients.length === 0
                    ? "No won clients available yet"
                    : "Select an existing client..."}
              </option>
              {eligibleClients.map((client) => (
                <option key={client.leadId} value={client.leadId}>
                  {client.companyName} · {client.contactName}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-filled client fields */}
          {selectedClient ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="field-label">Client company</label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    readOnly
                    value={selectedClient.companyName}
                    className="field-input cursor-not-allowed pl-11 opacity-60"
                  />
                </div>
              </div>
              <div>
                <label className="field-label">Client contact</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    readOnly
                    value={selectedClient.contactName}
                    className="field-input cursor-not-allowed pl-11 opacity-60"
                  />
                </div>
              </div>
              <div>
                <label className="field-label">Client email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    readOnly
                    value={selectedClient.email}
                    className="field-input cursor-not-allowed pl-11 opacity-60"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Multi-select services */}
          <div className="mt-6">
            <label className="field-label">
              List of services <span className="ml-1 text-rose-300">*</span>
            </label>
            <p className="mb-3 text-sm text-slate-400">
              Select all services to cross-sell or upsell for this client.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ZOHO_LEAD_SERVICE_PICKLIST_VALUES.map((service) => {
                const checked = form.serviceInterest.includes(service)
                return (
                  <label
                    key={service}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                      checked
                        ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100"
                        : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/15 hover:bg-white/[0.05]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleService(service)}
                      className="h-4 w-4 shrink-0 rounded accent-indigo-500"
                    />
                    <span>{service}</span>
                  </label>
                )
              })}
            </div>
            {form.serviceInterest.length > 0 ? (
              <p className="mt-3 text-sm text-indigo-300">
                {form.serviceInterest.length} service{form.serviceInterest.length === 1 ? "" : "s"} selected
              </p>
            ) : null}
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="field-label">Notes</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className="field-textarea"
              placeholder="Describe the requested work, timelines, or context..."
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="primary-button mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Wrench className="h-4 w-4" />
            {loading ? "Submitting..." : "Submit request"}
          </button>

          {!loadingOptions && eligibleClients.length === 0 ? (
            <p className="mt-3 text-sm text-amber-200">
              No won clients yet. Submit a lead to Finanshels first — once it&apos;s marked as deal won, it will appear here.
            </p>
          ) : null}
        </form>
      </section>

      {/* Previous requests */}
      <section className="table-shell">
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
          <div>
            <p className="font-heading text-xl font-semibold text-white">Previous service requests</p>
            <p className="mt-1 text-sm text-slate-400">
              Your latest requests, visible while you create the next one.
            </p>
          </div>
          <Link href="/dashboard/service-requests" className="tag-pill">
            View all
          </Link>
        </div>

        {loadingRecent ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">Loading...</div>
        ) : recentRequests.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">No previous requests yet.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-slate-500">
                    <th className="px-6 py-4 font-medium">Client</th>
                    <th className="px-6 py-4 font-medium">Services</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-white/6 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{request.customerCompany}</p>
                        <p className="mt-1 text-xs text-slate-400">{request.customerContact}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{request.serviceName}</td>
                      <td className="px-6 py-4">
                        <span className={`status-pill ${statusStyles[request.status] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}>
                          {request.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(request.createdAt).toLocaleDateString("en-AE", {
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
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg font-semibold text-white">{request.customerCompany}</p>
                      <p className="mt-1 text-sm text-slate-400">{request.serviceName}</p>
                    </div>
                    <span className={`status-pill shrink-0 ${statusStyles[request.status] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}>
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    {new Date(request.createdAt).toLocaleDateString("en-AE", {
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
