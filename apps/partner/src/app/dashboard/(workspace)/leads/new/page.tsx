"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, Check, ChevronDown, Mail, Phone, Send, UserRound, X } from "lucide-react"
import { toast } from "sonner"

type Lead = {
  id: string
  customerName: string
  customerEmail: string
  status: string
  createdAt: string
}

type LeadOptionsResponse = {
  serviceOptions: string[]
  source: "crm" | "db-fallback" | "crm-fallback"
}

const statusStyles: Record<string, string> = {
  submitted: "border border-border bg-secondary text-foreground/90",
  qualified: "border border-border bg-secondary text-foreground/90",
  proposal_sent: "border border-border bg-secondary/60 text-foreground/90",
  deal_won: "border border-border bg-secondary text-foreground",
  deal_lost: "border border-border bg-secondary/60 text-[var(--portal-text-soft)]",
}

export default function NewLeadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceDropdownRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [serviceOptions, setServiceOptions] = useState<string[]>([])
  const [serviceOptionsSource, setServiceOptionsSource] =
    useState<LeadOptionsResponse["source"]>("crm-fallback")
  const [loadingServiceOptions, setLoadingServiceOptions] = useState(true)
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false)
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCompany: "",
    notes: "",
    serviceInterests: [] as string[],
  })

  useEffect(() => {
    setForm((current) => ({
      ...current,
      customerName: searchParams.get("contactName") ?? "",
      customerEmail: searchParams.get("email") ?? "",
      customerPhone: searchParams.get("phone") ?? "",
      customerCompany: searchParams.get("company") ?? "",
    }))
  }, [searchParams])

  useEffect(() => {
    fetch("/api/leads")
      .then((response) => response.json())
      .then((data) => {
        setRecentLeads((data.leads || []).slice().reverse().slice(0, 5))
        setLoadingRecent(false)
      })
      .catch(() => setLoadingRecent(false))
  }, [])

  useEffect(() => {
    fetch("/api/leads/options")
      .then((response) => response.json())
      .then((data: LeadOptionsResponse) => {
        setServiceOptions(data.serviceOptions || [])
        setServiceOptionsSource(data.source || "crm-fallback")
        setLoadingServiceOptions(false)
      })
      .catch(() => {
        setLoadingServiceOptions(false)
        toast.error("Unable to load service options.")
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
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          serviceInterest: form.serviceInterests,
        }),
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

          <div className="mt-6">
            <label className="field-label">Services interested in</label>
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
                  {loadingServiceOptions
                    ? "Loading services from CRM..."
                    : form.serviceInterests.length > 0
                      ? `${form.serviceInterests.length} service${form.serviceInterests.length === 1 ? "" : "s"} selected`
                      : "Select services from CRM"}
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
                    <div className="px-3 py-3 text-sm text-muted-foreground">
                      No CRM services available.
                    </div>
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

            <p className="mt-3 text-xs text-muted-foreground">
              Source:{" "}
              {serviceOptionsSource === "crm"
                ? "Zoho CRM picklist"
                : serviceOptionsSource === "db-fallback"
                  ? "workspace services fallback"
                  : "default CRM fallback"}
            </p>
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
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <p className="font-heading text-xl font-semibold text-foreground">Previous leads</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your latest submissions stay visible while you add the next one.
            </p>
          </div>
          <Link href="/dashboard/clients" className="tag-pill">
            View all
          </Link>
        </div>

        {loadingRecent ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">Loading leads...</div>
        ) : recentLeads.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            No previous leads yet.
          </div>
        ) : (
          <>
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
                    <tr
                      key={lead.id}
                      className="border-b border-border transition-colors hover:bg-secondary/50"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">{lead.customerName}</td>
                      <td className="px-6 py-4 text-[var(--portal-text-soft)]">{lead.customerEmail}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`status-pill ${statusStyles[lead.status] || "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
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

            <div className="grid gap-4 p-4 md:hidden">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-[1.5rem] border border-border bg-secondary/50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg font-semibold text-foreground">
                        {lead.customerName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{lead.customerEmail}</p>
                    </div>
                    <span
                      className={`status-pill ${statusStyles[lead.status] || "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
                    >
                      {lead.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
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
