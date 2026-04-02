import Link from "next/link"
import { db, leads, partners } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { Users, ArrowRight, Plus } from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    in_review: "bg-purple-950/60 border-purple-800/40 text-purple-400",
    qualified: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
    proposal_sent: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    converted: "bg-green-950/60 border-green-800/40 text-green-400",
    rejected: "bg-red-950/60 border-red-800/40 text-red-400",
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${map[status] ?? "bg-zinc-800 border-zinc-700 text-zinc-400"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}

const tabs = [
  { label: "All", value: undefined },
  { label: "Submitted", value: "submitted" },
  { label: "In Review", value: "in_review" },
  { label: "Converted", value: "converted" },
  { label: "Rejected", value: "rejected" },
] as const

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams

  const rows = await db
    .select({
      id: leads.id,
      customerName: leads.customerName,
      customerEmail: leads.customerEmail,
      customerCompany: leads.customerCompany,
      serviceInterest: leads.serviceInterest,
      status: leads.status,
      assignedTo: leads.assignedTo,
      createdAt: leads.createdAt,
      partnerId: leads.partnerId,
      partnerCompanyName: partners.companyName,
      partnerContactName: partners.contactName,
    })
    .from(leads)
    .leftJoin(partners, eq(leads.partnerId, partners.id))
    .where(and(isNull(leads.deletedAt), status ? eq(leads.status, status) : undefined))
    .orderBy(leads.createdAt)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Review and manage partner-submitted leads
          </p>
        </div>
        <Link
          href="/leads/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Lead
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map((tab) => {
          const isActive = status === tab.value || (!status && !tab.value)
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/leads?status=${tab.value}` : "/leads"}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium text-sm">No leads found</p>
            <p className="text-zinc-600 text-xs mt-1">
              {status
                ? `There are no leads with status "${status.replace(/_/g, " ")}".`
                : "Leads submitted by partners will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Services
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.map((lead) => {
                  const services = (() => {
                    try {
                      return (
                        JSON.parse(lead.serviceInterest) as string[]
                      ).join(", ")
                    } catch {
                      return lead.serviceInterest
                    }
                  })()

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="text-zinc-200 text-sm font-medium">
                          {lead.customerName}
                        </p>
                        <p className="text-zinc-500 text-xs">
                          {lead.customerCompany || lead.customerEmail}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-zinc-300 text-sm">
                          {lead.partnerCompanyName ?? "—"}
                        </p>
                        <p className="text-zinc-500 text-xs">
                          {lead.partnerContactName ?? ""}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-zinc-400 text-sm truncate max-w-[160px]">
                          {services || "—"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-zinc-500 text-sm">
                          {new Date(lead.createdAt).toLocaleDateString(
                            "en-AE",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-zinc-500 text-sm">
                          {lead.assignedTo ? (
                            <span className="text-zinc-300">
                              {lead.assignedTo.slice(0, 8)}…
                            </span>
                          ) : (
                            <span className="text-zinc-600">Unassigned</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                        >
                          View
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
