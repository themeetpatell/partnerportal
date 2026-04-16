import Link from "next/link"
import { notFound } from "next/navigation"
import { db, invoices, partners, serviceRequests } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Receipt,
} from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-slate-800 border-slate-700 text-slate-300",
    sent: "bg-blue-950/60 border-blue-800/40 text-blue-300",
    paid: "bg-green-950/60 border-green-800/40 text-green-300",
    overdue: "bg-red-950/60 border-red-800/40 text-red-300",
    cancelled: "bg-zinc-800 border-zinc-700 text-zinc-400",
  }

  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium capitalize ${map[status] ?? "bg-white/6 border-white/10 text-slate-300"}`}>
      {status}
    </span>
  )
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "—"
  }

  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "—"
  }

  return parsed.toLocaleDateString("en-AE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatMoney(value: string | null | undefined, currency: string) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [row] = await db
    .select({
      invoice: invoices,
      partner: partners,
      serviceRequest: serviceRequests,
    })
    .from(invoices)
    .leftJoin(partners, eq(invoices.partnerId, partners.id))
    .leftJoin(serviceRequests, eq(invoices.serviceRequestId, serviceRequests.id))
    .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
    .limit(1)

  if (!row) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{row.invoice.invoiceNumber}</h1>
              <StatusBadge status={row.invoice.status} />
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Created on {formatDate(row.invoice.createdAt)}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-800/30 bg-emerald-950/20 px-5 py-4 text-right">
          <p className="text-xs uppercase tracking-wider text-emerald-300">Total</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {formatMoney(row.invoice.total, row.invoice.currency)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="surface-card rounded-2xl p-6">
            <h2 className="mb-4 text-white font-semibold">Invoice Breakdown</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Subtotal</dt>
                <dd className="mt-1 text-sm text-white">
                  {formatMoney(row.invoice.subtotal, row.invoice.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Discount</dt>
                <dd className="mt-1 text-sm text-white">
                  {formatMoney(row.invoice.discount, row.invoice.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Tax</dt>
                <dd className="mt-1 text-sm text-white">
                  {formatMoney(row.invoice.tax, row.invoice.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Payment Terms</dt>
                <dd className="mt-1 text-sm text-white">{row.invoice.paymentTerms || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Period Start</dt>
                <dd className="mt-1 text-sm text-white">{formatDate(row.invoice.periodStart)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Period End</dt>
                <dd className="mt-1 text-sm text-white">{formatDate(row.invoice.periodEnd)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Due Date</dt>
                <dd className="mt-1 text-sm text-white">{formatDate(row.invoice.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Paid At</dt>
                <dd className="mt-1 text-sm text-white">{formatDate(row.invoice.paidAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="surface-card rounded-2xl p-6">
            <h2 className="mb-4 text-white font-semibold">Payment Notes</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-300">
              {row.invoice.paymentNotes || "No payment notes added."}
            </p>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="surface-card rounded-2xl p-6">
            <h2 className="mb-4 text-white font-semibold">Related Records</h2>
            <div className="space-y-3">
              {row.partner ? (
                <Link
                  href={`/partners/${row.partner.id}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition-colors hover:bg-white/[0.04]"
                >
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {row.partner.companyName}
                </Link>
              ) : null}
              {row.serviceRequest ? (
                <Link
                  href={`/service-requests/${row.serviceRequest.id}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition-colors hover:bg-white/[0.04]"
                >
                  <Receipt className="h-4 w-4 text-slate-400" />
                  Linked service request
                </Link>
              ) : null}
            </div>
          </div>

          <div className="surface-card rounded-2xl p-6">
            <h2 className="mb-4 text-white font-semibold">Metadata</h2>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-slate-500" />
                <span>ID: <span className="font-mono text-slate-400">{row.invoice.id}</span></span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>Issued at: {formatDate(row.invoice.issuedAt)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>Voided at: {formatDate(row.invoice.voidedAt)}</span>
              </div>
            </div>
            {row.invoice.voidReason ? (
              <div className="mt-4 rounded-xl border border-red-900/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
                Void reason: {row.invoice.voidReason}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  )
}
