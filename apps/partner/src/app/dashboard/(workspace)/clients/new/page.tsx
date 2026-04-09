"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, CalendarClock, Mail, MapPin, Phone, Save, UserRound } from "lucide-react"
import { toast } from "sonner"

type PartnerClient = {
  id: string
  companyName: string
  contactName: string
  email: string | null
  phone: string | null
  nationality: string | null
  tradeLicenseNumber: string | null
  city: string | null
  country: string | null
  status: string
  renewalDate: string | null
  createdAt: string
}

const CLIENT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "watchlist", label: "Watchlist" },
  { value: "inactive", label: "Inactive" },
] as const

function toDateInputValue(value: string | null) {
  if (!value) {
    return ""
  }

  return new Date(value).toISOString().slice(0, 10)
}

export default function NewClientPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [recentClients, setRecentClients] = useState<PartnerClient[]>([])
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    nationality: "",
    tradeLicenseNumber: "",
    city: "",
    country: "",
    status: "active",
    renewalDate: "",
    notes: "",
  })

  useEffect(() => {
    setForm((current) => ({
      ...current,
      companyName: searchParams.get("company") ?? "",
      contactName: searchParams.get("contactName") ?? "",
      email: searchParams.get("email") ?? "",
      phone: searchParams.get("phone") ?? "",
      city: searchParams.get("city") ?? "",
      country: searchParams.get("country") ?? "",
    }))
  }, [searchParams])

  useEffect(() => {
    fetch("/api/partner-clients")
      .then((response) => response.json())
      .then((data) => {
        setRecentClients((data.partnerClients || []).slice().reverse().slice(0, 5))
        setLoadingRecent(false)
      })
      .catch(() => setLoadingRecent(false))
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/partner-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save client.")
      }

      toast.success("Client saved.")
      setForm({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        nationality: "",
        tradeLicenseNumber: "",
        city: "",
        country: "",
        status: "active",
        renewalDate: "",
        notes: "",
      })
      setRecentClients((current) => [
        data.partnerClient,
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
            <h1 className="page-title">Add a client</h1>
            <p className="page-subtitle mt-3">
              Save partner-owned clients independently of Finanshels lead and request activity.
            </p>
          </div>
          <Link href="/dashboard/clients" className="tag-pill w-full justify-center sm:w-auto">
            View clients
          </Link>
        </div>

        <form
          onSubmit={submit}
          className="form-shell mt-6 border-0 bg-transparent p-0 shadow-none"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                label: "Company",
                key: "companyName",
                placeholder: "Acme LLC",
                type: "text",
                required: true,
                icon: Building2,
              },
              {
                label: "Primary contact",
                key: "contactName",
                placeholder: "John Smith",
                type: "text",
                required: true,
                icon: UserRound,
              },
              {
                label: "Email",
                key: "email",
                placeholder: "john@example.com",
                type: "email",
                required: false,
                icon: Mail,
              },
              {
                label: "Phone",
                key: "phone",
                placeholder: "+971 50 000 0000",
                type: "text",
                required: false,
                icon: Phone,
              },
              {
                label: "Nationality",
                key: "nationality",
                placeholder: "Indian",
                type: "text",
                required: false,
                icon: UserRound,
              },
              {
                label: "Trade license number",
                key: "tradeLicenseNumber",
                placeholder: "TL-123456",
                type: "text",
                required: false,
                icon: Building2,
              },
              {
                label: "City",
                key: "city",
                placeholder: "Dubai",
                type: "text",
                required: false,
                icon: MapPin,
              },
              {
                label: "Country",
                key: "country",
                placeholder: "UAE",
                type: "text",
                required: false,
                icon: MapPin,
              },
            ].map((field) => (
              <div key={field.key}>
                <label className="field-label">
                  {field.label}
                  {field.required ? (
                    <span className="ml-1 text-rose-300">*</span>
                  ) : null}
                </label>
                <div className="relative">
                  <field.icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required={field.required}
                    type={field.type}
                    value={(form as Record<string, unknown>)[field.key] as string}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="field-input pl-11"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Status</label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
                className="field-input"
              >
                {CLIENT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Renewal date</label>
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={form.renewalDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      renewalDate: event.target.value,
                    }))
                  }
                  className="field-input pl-11"
                />
              </div>
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
              placeholder="Key context, renewal reminders, pricing details, or relationship notes..."
              className="field-textarea"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary-button mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save client"}
          </button>
        </form>
      </section>

      <section className="table-shell">
        <div className="flex flex-col gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-heading text-xl font-semibold text-foreground">Recent clients</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest partner-owned client records saved to your workspace.
            </p>
          </div>
          <Link href="/dashboard/clients" className="tag-pill">
            Back to list
          </Link>
        </div>

        {loadingRecent ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            Loading clients...
          </div>
        ) : recentClients.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            No saved clients yet.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-6 py-4 font-medium">Company</th>
                    <th className="px-6 py-4 font-medium">Contact</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Renewal</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-border transition-colors hover:bg-secondary/50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{client.companyName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[client.city, client.country, client.nationality].filter(Boolean).join(", ") || "No location"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-[var(--portal-text-soft)]">
                        <p>{client.contactName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {client.email || client.phone || "No contact details"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-[var(--portal-text-soft)] capitalize">
                        {client.status.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {toDateInputValue(client.renewalDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 md:hidden">
              {recentClients.map((client) => (
                <div
                  key={client.id}
                  className="rounded-[1.5rem] border border-border bg-secondary/50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg font-semibold text-foreground">
                        {client.companyName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {client.city || client.country || "No location"}
                      </p>
                    </div>
                    <span className="status-pill border border-border bg-secondary/70 text-[var(--portal-text-soft)]">
                      {client.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-4 rounded-[1.15rem] border border-border bg-black/10 p-3">
                    <p className="text-sm text-foreground">{client.contactName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {client.email || client.phone || "No contact details"}
                    </p>
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Renewal {toDateInputValue(client.renewalDate) || "not set"}
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
