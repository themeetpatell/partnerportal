"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Mail, UserRound, Wrench } from "lucide-react"
import { toast } from "sonner"

const SERVICES = [
  "Tax Registration",
  "VAT Filing",
  "Bookkeeping",
  "Company Formation",
  "Audit & Assurance",
  "CFO Services",
]

type ServiceRequest = {
  id: string
  customerCompany: string
  customerContact: string
  customerEmail: string
  serviceName: string
  status: string
  createdAt: string
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
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [form, setForm] = useState({
    clientCompany: "",
    clientContact: "",
    clientEmail: "",
    serviceType: "",
    description: "",
  })

  useEffect(() => {
    fetch("/api/service-requests")
      .then((response) => response.json())
      .then((data) => {
        setRecentRequests((data.serviceRequests || []).slice().reverse().slice(0, 5))
        setLoadingRecent(false)
      })
      .catch(() => setLoadingRecent(false))
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        throw new Error("Failed")
      }

      const data = await response.json()
      toast.success("Request submitted.")
      setForm({
        clientCompany: "",
        clientContact: "",
        clientEmail: "",
        serviceType: "",
        description: "",
      })
      setRecentRequests((current) => [
        {
          id: data.serviceRequest.id,
          customerCompany: data.serviceRequest.customerCompany,
          customerContact: data.serviceRequest.customerContact,
          customerEmail: data.serviceRequest.customerEmail,
          serviceName: form.serviceType,
          status: data.serviceRequest.status,
          createdAt: data.serviceRequest.createdAt,
        },
        ...current,
      ].slice(0, 5))
      router.refresh()
    } catch {
      toast.error("Something went wrong")
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
              Create the request, then keep the latest client work submissions visible below.
            </p>
          </div>
          <Link href="/dashboard/service-requests" className="tag-pill">
            View all requests
          </Link>
        </div>

        <form onSubmit={submit} className="form-shell mt-6 border-0 bg-transparent p-0 shadow-none">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">
                Client company <span className="ml-1 text-rose-300">*</span>
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  value={form.clientCompany}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, clientCompany: event.target.value }))
                  }
                  className="field-input pl-11"
                  placeholder="Client company"
                />
              </div>
            </div>

            <div>
              <label className="field-label">
                Client contact <span className="ml-1 text-rose-300">*</span>
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  value={form.clientContact}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, clientContact: event.target.value }))
                  }
                  className="field-input pl-11"
                  placeholder="Contact name"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">
                Client email <span className="ml-1 text-rose-300">*</span>
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  type="email"
                  value={form.clientEmail}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, clientEmail: event.target.value }))
                  }
                  className="field-input pl-11"
                  placeholder="client@example.com"
                />
              </div>
            </div>

            <div>
              <label className="field-label">
                Service type <span className="ml-1 text-rose-300">*</span>
              </label>
              <select
                required
                value={form.serviceType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, serviceType: event.target.value }))
                }
                className="field-select"
              >
                <option value="">Select a service...</option>
                {SERVICES.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="field-label">Description</label>
            <textarea
              rows={6}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className="field-textarea"
              placeholder="Describe the requested work, timelines, context, or constraints..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary-button mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Wrench className="h-4 w-4" />
            {loading ? "Submitting..." : "Submit request"}
          </button>
        </form>
      </section>

      <section className="table-shell">
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
          <div>
            <p className="font-heading text-xl font-semibold text-white">Previous service requests</p>
            <p className="mt-1 text-sm text-slate-400">
              Your latest requests stay visible while you create the next one.
            </p>
          </div>
          <Link href="/dashboard/service-requests" className="tag-pill">
            View all
          </Link>
        </div>

        {loadingRecent ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">
            Loading service requests...
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">
            No previous service requests yet.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-slate-500">
                    <th className="px-6 py-4 font-medium">Client</th>
                    <th className="px-6 py-4 font-medium">Contact</th>
                    <th className="px-6 py-4 font-medium">Service</th>
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
                      <td className="px-6 py-4 font-medium text-white">
                        {request.customerCompany}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white">{request.customerContact}</p>
                        <p className="text-xs text-slate-400">{request.customerEmail}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{request.serviceName}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`status-pill ${statusStyles[request.status] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                        >
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
                      <p className="font-heading text-lg font-semibold text-white">
                        {request.customerCompany}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {request.serviceName} · {request.customerContact}
                      </p>
                    </div>
                    <span
                      className={`status-pill ${statusStyles[request.status] || "border border-white/10 bg-white/[0.05] text-slate-300"}`}
                    >
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
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
