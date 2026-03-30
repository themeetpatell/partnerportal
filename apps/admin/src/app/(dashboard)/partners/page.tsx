import Link from "next/link"
import { db, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import { Building2, ArrowRight, UserCheck } from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    approved: "bg-green-950/60 border-green-800/40 text-green-400",
    rejected: "bg-red-950/60 border-red-800/40 text-red-400",
    suspended: "bg-white/6 border-white/10 text-slate-400",
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${map[status] ?? "bg-white/6 border-white/10 text-slate-400"}`}
    >
      {status}
    </span>
  )
}

const tabs = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Suspended", value: "suspended" },
] as const

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams

  const rows = await db
    .select({
      id: partners.id,
      companyName: partners.companyName,
      contactName: partners.contactName,
      email: partners.email,
      phone: partners.phone,
      type: partners.type,
      status: partners.status,
      createdAt: partners.createdAt,
    })
    .from(partners)
    .where(status ? eq(partners.status, status) : undefined)
    .orderBy(partners.createdAt)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Partners</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage partner accounts, approvals, and status
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 surface-card rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const isActive = status === tab.value || (!status && !tab.value)
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/partners?status=${tab.value}` : "/partners"}
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

      {/* Table */}
      <div className="surface-card rounded-2xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-white/6 border border-white/8 flex items-center justify-center mb-4">
              <UserCheck className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium text-sm">
              No {status ?? ""} partners found
            </p>
            <p className="text-slate-600 text-xs mt-1">
              {status === "pending"
                ? "All partner applications have been reviewed."
                : "Partners will appear here once they register."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {rows.map((partner) => (
                  <tr
                    key={partner.id}
                    className="hover:bg-white/[0.04] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/6 border border-white/8 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="text-white text-sm font-medium">
                          {partner.companyName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-300 text-sm">
                        {partner.contactName}
                      </p>
                      <p className="text-slate-500 text-xs">{partner.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-300 text-sm capitalize">
                        {partner.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={partner.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-500 text-sm">
                        {new Date(partner.createdAt).toLocaleDateString(
                          "en-AE",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/partners/${partner.id}`}
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
