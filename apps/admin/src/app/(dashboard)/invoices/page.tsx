import Link from "next/link"
import { db, invoices, partners } from "@repo/db"
import { and, eq, isNull, sum } from "drizzle-orm"
import { FileText, ArrowRight, Clock, CheckCircle2, AlertCircle } from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-white/6 border-white/10 text-slate-400",
    sent: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    paid: "bg-green-950/60 border-green-800/40 text-green-400",
    overdue: "bg-red-950/60 border-red-800/40 text-red-400",
    cancelled: "bg-white/6 border-white/10 text-slate-500",
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
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
] as const

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams

  const [rows, sentSum, paidSum, overdueSum] = await Promise.all([
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
        currency: invoices.currency,
        status: invoices.status,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        createdAt: invoices.createdAt,
        partnerId: invoices.partnerId,
        partnerCompanyName: partners.companyName,
        partnerContactName: partners.contactName,
      })
      .from(invoices)
      .leftJoin(partners, eq(invoices.partnerId, partners.id))
      .where(and(isNull(invoices.deletedAt), status ? eq(invoices.status, status) : undefined))
      .orderBy(invoices.createdAt),
    db.select({ total: sum(invoices.total) }).from(invoices).where(and(isNull(invoices.deletedAt), eq(invoices.status, "sent"))),
    db.select({ total: sum(invoices.total) }).from(invoices).where(and(isNull(invoices.deletedAt), eq(invoices.status, "paid"))),
    db.select({ total: sum(invoices.total) }).from(invoices).where(and(isNull(invoices.deletedAt), eq(invoices.status, "overdue"))),
  ])

  function fmt(val: string | null | undefined) {
    return Number(val ?? 0).toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const summaryCards = [
    {
      label: "Outstanding",
      value: `AED ${fmt(sentSum[0]?.total)}`,
      icon: Clock,
      color: "text-blue-400",
      bg: "bg-blue-950/40 border-blue-800/30",
    },
    {
      label: "Collected",
      value: `AED ${fmt(paidSum[0]?.total)}`,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-950/40 border-green-800/30",
    },
    {
      label: "Overdue",
      value: `AED ${fmt(overdueSum[0]?.total)}`,
      icon: AlertCircle,
      color: "text-red-400",
      bg: "bg-red-950/40 border-red-800/30",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Invoices</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage and track partner invoices
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="surface-card rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{card.value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 surface-card rounded-lg p-1 w-fit flex-wrap">
        {tabs.map((tab) => {
          const isActive = status === tab.value || (!status && !tab.value)
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/invoices?status=${tab.value}` : "/invoices"}
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
              <FileText className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium text-sm">No invoices found</p>
            <p className="text-slate-600 text-xs mt-1">
              {status
                ? `There are no invoices with status "${status}".`
                : "Invoices will appear here once generated."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Partner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Paid At</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {rows.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-white text-sm font-mono">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white text-sm font-medium">{invoice.partnerCompanyName ?? "—"}</p>
                      <p className="text-slate-500 text-xs">{invoice.partnerContactName ?? ""}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white text-sm font-semibold">
                        {invoice.currency} {Number(invoice.total).toLocaleString("en-AE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-500 text-sm">
                        {new Date(invoice.dueDate).toLocaleDateString("en-AE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {invoice.paidAt ? (
                        <span className="text-green-400 text-sm">
                          {new Date(invoice.paidAt).toLocaleDateString("en-AE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/invoices/${invoice.id}`}
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
