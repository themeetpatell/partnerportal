"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Plus, Radar, Users } from "lucide-react"

type Lead = {
  id: string
  customerName: string
  customerEmail: string
  status: string
  createdAt: string
}

const statusStyles: Record<string, string> = {
  submitted: "border border-sky-300/20 bg-sky-400/10 text-sky-100",
  in_review: "border border-amber-300/20 bg-amber-300/10 text-amber-100",
  qualified: "border border-violet-300/20 bg-violet-400/10 text-violet-100",
  proposal_sent: "border border-orange-300/20 bg-orange-400/10 text-orange-100",
  converted: "border border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
  rejected: "border border-rose-300/20 bg-rose-400/10 text-rose-100",
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/leads")
      .then((response) => response.json())
      .then((data) => {
        setLeads(data.leads || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const activeCount = leads.filter(
    (lead) => !["converted", "rejected"].includes(lead.status),
  ).length
  const convertedCount = leads.filter((lead) => lead.status === "converted").length

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">Lead pipeline</div>
            <h1 className="page-title mt-5">My leads</h1>
            <p className="page-subtitle mt-3 max-w-2xl">
              Track every opportunity you’ve introduced and keep a clean view of what is moving,
              converting, or needs attention.
            </p>
          </div>

          <Link href="/dashboard/leads/new" className="primary-button">
            <Plus className="h-4 w-4" />
            Submit lead
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="metric-card">
            <p className="metric-value">{leads.length}</p>
            <p className="mt-2 text-sm font-semibold text-white">Total leads</p>
            <p className="mt-1 text-sm text-slate-400">Every opportunity submitted so far.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{activeCount}</p>
            <p className="mt-2 text-sm font-semibold text-white">Active pipeline</p>
            <p className="mt-1 text-sm text-slate-400">Leads currently in motion.</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{convertedCount}</p>
            <p className="mt-2 text-sm font-semibold text-white">Converted</p>
            <p className="mt-1 text-sm text-slate-400">Leads that became customers.</p>
          </div>
        </div>
      </section>

      <section className="table-shell">
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
          <div>
            <p className="font-heading text-xl font-semibold text-white">Opportunity list</p>
            <p className="mt-1 text-sm text-slate-400">
              Most recent submissions appear first in your working list.
            </p>
          </div>
          <span className="tag-pill">
            <Radar className="h-4 w-4 text-[#8ce7db]" />
            Live view
          </span>
        </div>

        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">
            Loading your lead pipeline...
          </div>
        ) : leads.length === 0 ? (
          <div className="empty-state m-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/6 text-[#8ce7db]">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-5 font-heading text-2xl font-semibold text-white">
              No leads yet
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
              Start with your first qualified referral so the pipeline, status tracking,
              and commission view have something to work with.
            </p>
            <Link href="/dashboard/leads/new" className="primary-button mt-6">
              Submit your first lead
              <ArrowRight className="h-4 w-4" />
            </Link>
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
                  {leads.map((lead) => (
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
              {leads.map((lead) => (
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
