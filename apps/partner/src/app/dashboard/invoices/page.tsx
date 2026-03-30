import { FileText, ReceiptText } from "lucide-react"

export default function InvoicesPage() {
  return (
    <div className="space-y-8">
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
        <div className="eyebrow">Billing records</div>
        <h1 className="page-title mt-5">Invoices</h1>
        <p className="page-subtitle mt-3 max-w-2xl">
          Invoice history will live here once channel partner billing and settlement flows are active in the portal.
        </p>
      </section>

      <section className="empty-state">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/12 text-indigo-300">
          <ReceiptText className="h-6 w-6" />
        </div>
        <p className="mt-5 font-heading text-2xl font-semibold text-white">
          No invoices yet
        </p>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-400">
          When invoice issuance is enabled for partner billing, the history and downloadable records will appear here.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
          <FileText className="h-4 w-4 text-indigo-300" />
          Reserved for future billing workflows
        </div>
      </section>
    </div>
  )
}
