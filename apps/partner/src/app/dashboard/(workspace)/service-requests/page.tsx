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
  pending: "border border-zinc-300/20 bg-zinc-300/10 text-zinc-100",
  in_progress: "border border-zinc-400/20 bg-zinc-400/10 text-zinc-100",
  completed: "border border-white/20 bg-white/10 text-white",
  cancelled: "border border-zinc-600/20 bg-zinc-500/10 text-zinc-300",
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
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">Delivery requests</div>
            <h1 className="page-title mt-5">Service requests</h1>
            <p className="page-subtitle mt-3 max-w-2xl">
              Route existing clients into Finanshels service delivery from a cleaner, more accountable intake point.
            </p>
          </div>

          <Link href="/dashboard/service-requests/new" className="primary-button">
            <Plus className="h-4 w-4" />
            New request
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="metric-card">
            <p className="metric-value">{requests.length}</p>
            <p className="mt-2 text-sm font-semibold text-white">Total requests</p>
            <p className="mt-1 text-sm text-slate-400">All submitted client delivery requests.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{activeRequests}</p>
            <p className="mt-2 text-sm font-semibold text-white">Active requests</p>
            <p className="mt-1 text-sm text-slate-400">Requests still in progress or pending.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{requests.length - activeRequests}</p>
            <p className="mt-2 text-sm font-semibold text-white">Closed requests</p>
            <p className="mt-1 text-sm text-slate-400">Completed or cancelled delivery items.</p>
          </div>
        </div>
      </section>

      <section className="table-shell">
        <div className="border-b border-white/8 px-6 py-5">
          <p className="font-heading text-xl font-semibold text-white">Request queue</p>
          <p className="mt-1 text-sm text-slate-400">
            Intake records submitted by your partner account.
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">
            Loading service requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state m-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/12 text-indigo-200">
              <ClipboardList className="h-6 w-6" />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-white">
              No service requests yet
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
              Start a request when you already have a client conversation moving and need Finanshels to step into execution.
            </p>
            <Link href="/dashboard/service-requests/new" className="primary-button mt-6">
              <Wrench className="h-4 w-4" />
              Create request
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {requests.map((request) => (
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
        )}
      </section>
    </div>
  )
}
