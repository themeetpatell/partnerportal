"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ClipboardList, Plus, Wrench } from "lucide-react"

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
  pending: "border border-border bg-secondary text-foreground/90",
  in_progress: "border border-border bg-secondary text-foreground/90",
  completed: "border border-border bg-secondary text-foreground",
  cancelled: "border border-border bg-secondary text-[var(--portal-text-soft)]",
}

export default function ServiceRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/service-requests")
      .then((response) => response.json())
      .then((data) => {
        setRequests(data.serviceRequests || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const activeRequests = requests.filter(
    (request) => !["completed", "cancelled"].includes(request.status),
  ).length

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-[2rem] px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">Delivery requests</div>
            <h1 className="page-title mt-5">Service requests</h1>
            <p className="page-subtitle mt-3 max-w-2xl">
              Route existing clients into Finanshels service delivery from a cleaner, more accountable intake point.
            </p>
          </div>

          <Link href="/dashboard/service-requests/new" className="primary-button w-full justify-center sm:w-auto">
            <Plus className="h-4 w-4" />
            New request
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="metric-card">
            <p className="metric-value">{requests.length}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Total requests</p>
            <p className="mt-1 text-sm text-muted-foreground">All submitted client delivery requests.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{activeRequests}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Active requests</p>
            <p className="mt-1 text-sm text-muted-foreground">Requests still in progress or pending.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{requests.length - activeRequests}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Closed requests</p>
            <p className="mt-1 text-sm text-muted-foreground">Completed or cancelled delivery items.</p>
          </div>
        </div>
      </section>

      <section className="table-shell">
        <div className="border-b border-border px-6 py-5">
          <p className="font-heading text-xl font-semibold text-foreground">Request queue</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Intake records submitted by your partner account.
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            Loading service requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state m-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
              <ClipboardList className="h-6 w-6" />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-foreground">
              No service requests yet
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              Start a request when you already have a client conversation moving and need Finanshels to step into execution.
            </p>
            <Link href="/dashboard/service-requests/new" className="primary-button mt-6">
              <Wrench className="h-4 w-4" />
              Create request
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-6 py-4 font-medium">Client</th>
                    <th className="px-6 py-4 font-medium">Contact</th>
                    <th className="px-6 py-4 font-medium">Service</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-border transition-colors hover:bg-secondary/50"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {request.customerCompany}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-foreground">{request.customerContact}</p>
                        <p className="text-xs text-muted-foreground">{request.customerEmail}</p>
                      </td>
                      <td className="px-6 py-4 text-[var(--portal-text-soft)]">{request.serviceName}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`status-pill ${statusStyles[request.status] || "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
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

            <div className="grid gap-4 p-4 md:hidden">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-[1.5rem] border border-border bg-secondary/50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg font-semibold text-foreground">
                        {request.customerCompany}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{request.serviceName}</p>
                    </div>
                    <span
                      className={`status-pill shrink-0 ${statusStyles[request.status] || "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
                    >
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-4 rounded-[1.15rem] border border-border bg-black/10 p-3">
                    <p className="text-sm text-foreground">{request.customerContact}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{request.customerEmail}</p>
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
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
