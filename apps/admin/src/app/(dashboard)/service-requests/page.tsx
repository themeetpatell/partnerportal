import Link from "next/link"
import { db, serviceRequests, partners, services } from "@repo/db"
import { eq } from "drizzle-orm"
import { ClipboardList, ArrowRight } from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    in_progress: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    completed: "bg-green-950/60 border-green-800/40 text-green-400",
    cancelled: "bg-red-950/60 border-red-800/40 text-red-400",
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${map[status] ?? "bg-white/6 border-white/10 text-slate-400"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}

const tabs = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
] as const

export default async function ServiceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams

  const rows = await db
    .select({
      id: serviceRequests.id,
      customerCompany: serviceRequests.customerCompany,
      customerContact: serviceRequests.customerContact,
      customerEmail: serviceRequests.customerEmail,
      status: serviceRequests.status,
      assignedTo: serviceRequests.assignedTo,
      startDate: serviceRequests.startDate,
      createdAt: serviceRequests.createdAt,
      partnerId: serviceRequests.partnerId,
      partnerCompanyName: partners.companyName,
      serviceName: services.name,
      serviceCategory: services.category,
    })
    .from(serviceRequests)
    .leftJoin(partners, eq(serviceRequests.partnerId, partners.id))
    .leftJoin(services, eq(serviceRequests.serviceId, services.id))
    .where(status ? eq(serviceRequests.status, status) : undefined)
    .orderBy(serviceRequests.createdAt)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Service Requests</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage service requests submitted by partners
        </p>
      </div>

      <div className="flex gap-1 surface-card rounded-lg p-1 w-fit flex-wrap">
        {tabs.map((tab) => {
          const isActive = status === tab.value || (!status && !tab.value)
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/service-requests?status=${tab.value}` : "/service-requests"}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/6 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      <div className="surface-card rounded-2xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-white/6 border border-white/8 flex items-center justify-center mb-4">
              <ClipboardList className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium text-sm">No service requests found</p>
            <p className="text-slate-600 text-xs mt-1">
              {status
                ? `There are no requests with status "${status.replace(/_/g, " ")}".`
                : "Service requests submitted by partners will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Partner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {rows.map((req) => (
                  <tr key={req.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white text-sm font-medium">{req.customerCompany}</p>
                      <p className="text-slate-500 text-xs">{req.customerContact}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-300 text-sm">{req.partnerCompanyName ?? "—"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-300 text-sm">{req.serviceName ?? "—"}</p>
                      <p className="text-slate-500 text-xs capitalize">{req.serviceCategory ?? ""}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-6 py-4">
                      {req.assignedTo ? (
                        <span className="text-zinc-300 text-sm">{req.assignedTo.slice(0, 8)}…</span>
                      ) : (
                        <span className="text-slate-600 text-sm">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-500 text-sm">
                        {new Date(req.createdAt).toLocaleDateString("en-AE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/service-requests/${req.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        View
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
