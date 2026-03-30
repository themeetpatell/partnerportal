"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Props {
  partners: { id: string; companyName: string }[]
  serviceRequests: { id: string; customerCompany: string; partnerId: string; status: string }[]
}

const CURRENCIES = ["AED", "USD", "EUR", "GBP", "SAR"] as const
const STATUSES = ["draft", "sent"] as const
const PAYMENT_TERMS = ["Immediate", "Net 7", "Net 14", "Net 30", "Net 60"] as const

export function NewInvoiceForm({ partners, serviceRequests }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const form_defaults = {
    partnerId: "",
    serviceRequestId: "",
    periodStart: today,
    periodEnd: today,
    subtotal: "",
    discount: "0",
    tax: "0",
    currency: "AED" as (typeof CURRENCIES)[number],
    paymentTerms: "Net 30",
    paymentNotes: "",
    dueDate: "",
    status: "draft" as (typeof STATUSES)[number],
  }
  const [form, setForm] = useState(form_defaults)

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  // When SR is selected, auto-fill partner
  function handleSrSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const srId = e.target.value
    const sr = serviceRequests.find((s) => s.id === srId)
    setForm((f) => ({
      ...f,
      serviceRequestId: srId,
      partnerId: sr?.partnerId ?? f.partnerId,
    }))
  }

  const filteredSRs = form.partnerId
    ? serviceRequests.filter((s) => s.partnerId === form.partnerId)
    : serviceRequests

  const total = useMemo(() => {
    const sub = Number(form.subtotal) || 0
    const disc = Number(form.discount) || 0
    const tax = Number(form.tax) || 0
    return Math.max(0, sub - disc + tax)
  }, [form.subtotal, form.discount, form.tax])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create invoice")
      toast.success(`Invoice ${data.invoiceNumber} created`)
      router.push(`/invoices/${data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/invoices"
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">New Invoice</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Finance / Admin only.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Partner + Service Request */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Recipient</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Partner *">
              <select required value={form.partnerId} onChange={set("partnerId")} className={selectCls}>
                <option value="">Select partner…</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.companyName}</option>
                ))}
              </select>
            </Field>
            <Field label="Linked Service Request (optional)">
              <select value={form.serviceRequestId} onChange={handleSrSelect} className={selectCls}>
                <option value="">— Standalone —</option>
                {filteredSRs.map((s) => (
                  <option key={s.id} value={s.id}>{s.customerCompany} ({s.status})</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Period */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Billing Period</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Period Start *">
              <input required type="date" value={form.periodStart} onChange={set("periodStart")} className={inputCls} />
            </Field>
            <Field label="Period End *">
              <input required type="date" value={form.periodEnd} onChange={set("periodEnd")} className={inputCls} />
            </Field>
            <Field label="Due Date *">
              <input required type="date" value={form.dueDate} onChange={set("dueDate")} className={inputCls} />
            </Field>
            <Field label="Payment Terms">
              <select value={form.paymentTerms} onChange={set("paymentTerms")} className={selectCls}>
                {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
        </section>

        {/* Financials */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Financials</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Subtotal *">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.subtotal}
                onChange={set("subtotal")}
                placeholder="0.00"
                className={inputCls}
              />
            </Field>
            <Field label="Discount">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={set("discount")}
                placeholder="0.00"
                className={inputCls}
              />
            </Field>
            <Field label="Tax">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.tax}
                onChange={set("tax")}
                placeholder="0.00"
                className={inputCls}
              />
            </Field>
            <Field label="Currency">
              <select value={form.currency} onChange={set("currency")} className={selectCls}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          {/* Total preview */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/60 border border-zinc-700 rounded-lg">
            <span className="text-zinc-400 text-sm">Total</span>
            <span className="text-white font-bold text-lg">
              {form.currency}{" "}
              {total.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </section>

        {/* Status + Notes */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Options</h2>
          <Field label="Initial Status">
            <select value={form.status} onChange={set("status")} className={selectCls}>
              {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </Field>
          <Field label="Payment Notes">
            <textarea
              value={form.paymentNotes}
              onChange={set("paymentNotes")}
              rows={2}
              placeholder="Bank details, reconciliation notes…"
              className={inputCls + " resize-none"}
            />
          </Field>
        </section>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/invoices" className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls =
  "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"

const selectCls =
  "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  )
}
