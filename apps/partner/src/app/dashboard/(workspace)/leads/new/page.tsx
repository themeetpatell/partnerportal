"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, Check, ChevronDown, Mail, Phone, Send, UserRound, Wrench, X } from "lucide-react"
import { toast } from "sonner"

type LeadType = "new" | "existing"

type Lead = {
  id: string
  customerName: string
  customerEmail: string
  status: string
  createdAt: string
}

type ServiceRequest = {
  id: string
  customerCompany: string
  customerContact: string
  customerEmail: string
  serviceName: string
  status: string
  createdAt: string
}

type ServiceRequestOptionsResponse = {
  clients: {
    leadId: string
    companyName: string
    contactName: string
    email: string
    wonAt: string | null
  }[]
}

const leadStatusStyles: Record<string, string> = {
  submitted: "border border-border bg-secondary text-foreground/90",
  lead_approved: "border border-sky-500/25 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:text-sky-100",
  lead_follow_up: "border border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:border-cyan-400/20 dark:text-cyan-100",
  lead_qualified: "border border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400/20 dark:text-indigo-100",
  proposal_sent: "border border-primary/20 bg-primary/10 text-primary",
  deal_won: "border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-100",
  deal_lost: "border border-border bg-secondary/60 text-[var(--portal-text-soft)]",
}

const requestStatusStyles: Record<string, string> = {
  pending: "border border-border bg-secondary text-foreground/90",
  in_progress: "border border-border bg-secondary text-foreground/90",
  completed: "border border-border bg-secondary text-foreground",
  cancelled: "border border-border bg-secondary text-[var(--portal-text-soft)]",
}

export default function NewLeadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceDropdownRef = useRef<HTMLDivElement | null>(null)
  const [leadType, setLeadType] = useState<LeadType>("new")
  const [loading, setLoading] = useState(false)
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [serviceOptions, setServiceOptions] = useState<string[]>([])
  const [eligibleClients, setEligibleClients] = useState<ServiceRequestOptionsResponse["clients"]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false)
  const [form, setForm] = useState({
    existingLeadId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCompany: "",
    notes: "",
    serviceInterests: [] as string[],
  })

  const selectedClient = eligibleClients.find((client) => client.leadId === form.existingLeadId) ?? null

  useEffect(() => {
    const requestedType = searchParams.get("leadType")
    if (requestedType === "existing") {
      setLeadType("existing")
    }

    setForm((current) => ({
      ...current,
      customerName: searchParams.get("contactName") ?? "",
      customerEmail: searchParams.get("email") ?? "",
      customerPhone: searchParams.get("phone") ?? "",
      customerCompany: searchParams.get("company") ?? "",
    }))
  }, [searchParams])

  useEffect(() => {
    Promise.all([
      fetch("/api/leads"),
      fetch("/api/service-requests"),
      fetch("/api/leads/options"),
      fetch("/api/service-requests/options"),
    ])
      .then(async ([leadsResponse, requestsResponse, leadOptionsResponse, requestOptionsResponse]) => {
        const leadsData = await leadsResponse.json().catch(() => ({}))
        const requestsData = await requestsResponse.json().catch(() => ({}))
        const leadOptionsData = await leadOptionsResponse.json().catch(() => ({}))
        const requestOptionsData = await requestOptionsResponse.json().catch(() => ({}))

        setRecentLeads((leadsData.leads || []).slice().reverse().slice(0, 5))
        setRecentRequests((requestsData.serviceRequests || []).slice().reverse().slice(0, 5))
        setServiceOptions(leadOptionsData.serviceOptions || [])
        setEligibleClients(requestOptionsData.clients || [])
      })
      .catch(() => {
        toast.error("Unable to load lead options.")
      })
      .finally(() => {
        setLoadingOptions(false)
        setLoadingRecent(false)
      })
  }, [])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!serviceDropdownRef.current) {
        return
      }

      if (!serviceDropdownRef.current.contains(event.target as Node)) {
        setServiceDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
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
      if (leadType === "existing") {
        const response = await fetch("/api/service-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: form.existingLeadId,
            serviceInterest: form.serviceInterests,
            description: form.notes,
          }),
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || "Failed to submit existing client request.")
        }

        toast.success("Existing client referral submitted.")
        setForm((current) => ({
          ...current,
          existingLeadId: "",
          notes: "",
          serviceInterests: [],
        }))
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
          ].slice(0, 5),
        )
        router.refresh()
        return
      }

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          customerCompany: form.customerCompany,
          serviceInterest: form.serviceInterests,
          notes: form.notes,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit lead.")
      }

      toast.success("Lead submitted.")
      setForm((current) => ({
        ...current,
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerCompany: "",
        notes: "",
        serviceInterests: [],
      }))
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

  const canSubmit =
    !loading &&
    form.serviceInterests.length > 0 &&
    (leadType === "existing"
      ? Boolean(form.existingLeadId)
      : Boolean(form.customerName && form.customerEmail))

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-[2rem] p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="page-title">Create referral</h1>
            <p className="page-subtitle mt-3">
              Use one lead flow for both new clients and existing closed clients.
            </p>
          </div>
          <Link href="/dashboard/leads" className="tag-pill">
            View all referrals
          </Link>
        </div>

        <div className="mt-6 inline-flex rounded-xl border border-border bg-secondary/50 p-1">
          <button
            type="button"
            onClick={() => setLeadType("new")}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              leadType === "new" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            New lead
          </button>
          <button
            type="button"
            onClick={() => setLeadType("existing")}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              leadType === "existing"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Existing closed client
          </button>
        </div>

        <form onSubmit={submit} className="form-shell mt-6 border-0 bg-transparent p-0 shadow-none">
          {leadType === "existing" ? (
            <div>
              <label className="field-label">
                Existing client <span className="ml-1 text-rose-300">*</span>
              </label>
              <select
                required
                value={form.existingLeadId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, existingLeadId: event.target.value }))
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

              {selectedClient ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="field-label">Client company</label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        readOnly
                        value={selectedClient.email}
                        className="field-input cursor-not-allowed pl-11 opacity-60"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
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
                    <field.icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
          )}

          <div className="mt-6">
            <label className="field-label">
              Services interested in <span className="ml-1 text-rose-300">*</span>
            </label>
            <div ref={serviceDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setServiceDropdownOpen((current) => !current)}
                className="field-input flex min-h-[52px] w-full items-center justify-between gap-3 text-left"
              >
                <span
                  className={
                    form.serviceInterests.length > 0 ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {loadingOptions
                    ? "Loading services..."
                    : form.serviceInterests.length > 0
                      ? `${form.serviceInterests.length} service${form.serviceInterests.length === 1 ? "" : "s"} selected`
                      : "Select services"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    serviceDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {serviceDropdownOpen ? (
                <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-[1.2rem] border border-border bg-card p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                  {serviceOptions.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-muted-foreground">No services available.</div>
                  ) : (
                    serviceOptions.map((service) => {
                      const active = form.serviceInterests.includes(service)

                      return (
                        <button
                          key={service}
                          type="button"
                          onClick={() => toggle(service)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                            active
                              ? "bg-indigo-500/14 text-foreground"
                              : "text-[var(--portal-text-soft)] hover:bg-secondary/70"
                          }`}
                        >
                          <span>{service}</span>
                          {active ? <Check className="h-4 w-4 text-primary" /> : null}
                        </button>
                      )
                    })
                  )}
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {form.serviceInterests.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggle(service)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                >
                  {service}
                  <X className="h-3.5 w-3.5 text-primary" />
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">Uses the standard Finanshels service catalog.</p>
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

          {!loadingOptions && leadType === "existing" && eligibleClients.length === 0 ? (
            <p className="mt-3 text-sm text-amber-200">
              No won clients yet. Submit a lead first — once it becomes deal won, it will appear here.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="primary-button mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {leadType === "existing" ? <Wrench className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {loading
              ? "Submitting..."
              : leadType === "existing"
                ? "Submit existing client referral"
                : "Submit lead"}
          </button>
        </form>
      </section>

      <section className="table-shell">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <p className="font-heading text-xl font-semibold text-foreground">
              {leadType === "existing" ? "Previous existing client referrals" : "Previous leads"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {leadType === "existing"
                ? "Your latest existing-client requests."
                : "Your latest lead submissions."}
            </p>
          </div>
          <Link href="/dashboard/leads" className="tag-pill">
            View all
          </Link>
        </div>

        {loadingRecent ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">Loading...</div>
        ) : leadType === "existing" ? (
          recentRequests.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-muted-foreground">
              No existing client referrals yet.
            </div>
          ) : (
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-6 py-4 font-medium">Client</th>
                    <th className="px-6 py-4 font-medium">Services</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((request) => (
                    <tr key={request.id} className="border-b border-border transition-colors hover:bg-secondary/50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{request.customerCompany}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{request.customerContact}</p>
                      </td>
                      <td className="px-6 py-4 text-[var(--portal-text-soft)]">{request.serviceName}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`status-pill ${requestStatusStyles[request.status] || "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
                        >
                          {request.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
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
          )
        ) : recentLeads.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">No previous leads yet.</div>
        ) : (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border transition-colors hover:bg-secondary/50">
                    <td className="px-6 py-4 font-medium text-foreground">{lead.customerName}</td>
                    <td className="px-6 py-4 text-[var(--portal-text-soft)]">{lead.customerEmail}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`status-pill ${leadStatusStyles[lead.status] || "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
                      >
                        {lead.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
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
        )}
      </section>
    </div>
  )
}
