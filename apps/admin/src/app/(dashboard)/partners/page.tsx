import Link from "next/link"
import { db, derivePartnerOperationalStatus, formatPartnerOperationalStatus, leads, partners } from "@repo/db"
import { inArray, isNull } from "drizzle-orm"
import { Building2, ArrowRight, UserCheck, Plus } from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    approved: "bg-green-950/60 border-green-800/40 text-green-400",
    rejected: "bg-red-950/60 border-red-800/40 text-red-400",
    suspended: "bg-zinc-800 border-zinc-700 text-zinc-400",
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${map[status] ?? "bg-zinc-800 border-zinc-700 text-zinc-400"}`}
    >
      {status}
    </span>
  )
}

const tabs = [
  { label: "All", value: undefined },
  { label: "Active", value: "active_partner" },
  { label: "Inactive", value: "inactive_partner" },
  { label: "Yet To Activate", value: "yet_to_activate" },
  { label: "Yet To Onboard", value: "yet_to_onboard" },
] as const

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ operational?: string }>
}) {
  const { operational } = await searchParams

  const rows = await db
    .select({
      id: partners.id,
      companyName: partners.companyName,
      contactName: partners.contactName,
      email: partners.email,
      phone: partners.phone,
      type: partners.type,
      status: partners.status,
      agreementUrl: partners.agreementUrl,
      contractStatus: partners.contractStatus,
      contractSignedAt: partners.contractSignedAt,
      onboardedAt: partners.onboardedAt,
      createdAt: partners.createdAt,
    })
    .from(partners)
    .where(isNull(partners.deletedAt))
    .orderBy(partners.createdAt)

  const partnerLeadRows =
    rows.length === 0
      ? []
      : await db
          .select({
            partnerId: leads.partnerId,
            status: leads.status,
            createdAt: leads.createdAt,
          })
          .from(leads)
          .where(inArray(leads.partnerId, rows.map((row) => row.id)))

  const leadMap = partnerLeadRows.reduce(
    (map, row) => {
      const current = map.get(row.partnerId) ?? []
      current.push({ status: row.status, createdAt: row.createdAt })
      map.set(row.partnerId, current)
      return map
    },
    new Map<string, { status: string; createdAt: Date }[]>()
  )

  const scopedRows = rows
    .map((row) => {
      const operationalStatus = derivePartnerOperationalStatus(
        {
          contractStatus: row.contractStatus,
          contractSignedAt: row.contractSignedAt,
          onboardedAt: row.onboardedAt,
        },
        leadMap.get(row.id) ?? []
      )

      return {
        ...row,
        operationalStatus,
      }
    })
    .filter((row) => !operational || row.operationalStatus === operational)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Partners</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage partner accounts, approvals, onboarding, and automated lifecycle status
          </p>
        </div>
        <Link
          href="/partners/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Partner
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const isActive = operational === tab.value || (!operational && !tab.value)
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/partners?operational=${tab.value}` : "/partners"}
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
        {scopedRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
              <UserCheck className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium text-sm">
              No matching partners found
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              Partners will appear here once they register and move through onboarding.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Partner Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {scopedRows.map((partner) => (
                  <tr
                    key={partner.id}
                    className="hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-zinc-500" />
                        </div>
                        <span className="text-zinc-200 text-sm font-medium">
                          {partner.companyName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-300 text-sm">
                        {partner.contactName}
                      </p>
                      <p className="text-zinc-500 text-xs">{partner.email}</p>
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
                      <span className="text-zinc-300 text-sm capitalize">
                        {formatPartnerOperationalStatus(partner.operationalStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-500 text-sm">
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
