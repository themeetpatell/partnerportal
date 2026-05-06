"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export type BillableLeadRow = {
  id: string
  partnerId: string
  customerCompany: string | null
  customerName: string
  status: string
}

interface Props {
  partners: { id: string; companyName: string }[]
  billableLeads: BillableLeadRow[]
}

const CURRENCIES = ["AED", "USD", "EUR", "GBP", "SAR"] as const
const STATUSES = ["draft", "sent"] as const
const PAYMENT_TERMS = ["Immediate", "Net 7", "Net 14", "Net 30", "Net 60"] as const

export function NewInvoiceForm({ partners, billableLeads }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const form_defaults = {
    partnerId: "",
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
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const v = e.target.value
      setForm((f) => {
        const next = { ...f, [k]: v }
        if (k === "partnerId" && v !== f.partnerId) {
          setSelectedLeadIds(new Set())
        }
        return next
      })
    }

  const partnerLeads = useMemo(
    () =>
      form.partnerId
        ? billableLeads.filter((l) => l.partnerId === form.partnerId)
        : [],
    [billableLeads, form.partnerId],
  )

  const total = useMemo(() => {
    const sub = Number(form.subtotal) || 0
    const disc = Number(form.discount) || 0
    const tax = Number(form.tax) || 0
    return Math.max(0, sub - disc + tax)
  }, [form.subtotal, form.discount, form.tax])

  function toggleLead(id: string) {
    setSelectedLeadIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function selectAllPartnerLeads() {
    if (!partnerLeads.length) return
    setSelectedLeadIds(new Set(partnerLeads.map((l) => l.id)))
  }

  function clearLeadSelection() {
    setSelectedLeadIds(new Set())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const relatedLeadIds = Array.from(selectedLeadIds)
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          relatedLeadIds: relatedLeadIds.length ? relatedLeadIds : undefined,
        }),
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
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/invoices"
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Partner commission invoice</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Bill the partner for collected lead payments — tie line items to one or more leads for
            audit and reconciliation.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Partner & scope</h2>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Partner *">
              <select required value={form.partnerId} onChange={set("partnerId")} className={selectCls}>
                <option value="">Select partner…</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.companyName}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {form.partnerId ? (
            <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-zinc-400">
                  Related leads (optional, multi-select)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllPartnerLeads}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Select all ({partnerLeads.length})
                  </button>
                  <button
                    type="button"
                    onClick={clearLeadSelection}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {partnerLeads.length === 0 ? (
                <p className="text-sm text-zinc-600">No leads on file for this partner in your scope.</p>
              ) : (
                <ul className="max-h-56 space-y-1 overflow-y-auto pr-1 text-sm">
                  {partnerLeads.map((l) => {
                    const label =
                      [l.customerCompany, l.customerName].filter(Boolean).join(" · ") || l.customerName
                    const checked = selectedLeadIds.has(l.id)
                    return (
                      <li key={l.id}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-800/80">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLead(l.id)}
                            className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-indigo-600"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="text-zinc-200">{label}</span>
                            <span className="ml-2 text-xs capitalize text-zinc-500">
                              {l.status.replaceAll("_", " ")}
                            </span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Billing period</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Period start *">
              <input required type="date" value={form.periodStart} onChange={set("periodStart")} className={inputCls} />
            </Field>
            <Field label="Period end *">
              <input required type="date" value={form.periodEnd} onChange={set("periodEnd")} className={inputCls} />
            </Field>
            <Field label="Due date *">
              <input required type="date" value={form.dueDate} onChange={set("dueDate")} className={inputCls} />
            </Field>
            <Field label="Payment terms">
              <select value={form.paymentTerms} onChange={set("paymentTerms")} className={selectCls}>
                {PAYMENT_TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Amounts</h2>
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
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/60 border border-zinc-700 rounded-lg">
            <span className="text-zinc-400 text-sm">Total</span>
            <span className="text-white font-bold text-lg">
              {form.currency}{" "}
              {total.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Options</h2>
          <Field label="Initial status">
            <select value={form.status} onChange={set("status")} className={selectCls}>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment notes">
            <textarea
              value={form.paymentNotes}
              onChange={set("paymentNotes")}
              rows={3}
              placeholder="Bank details, commission period narrative, reconciliation IDs…"
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
            {saving ? "Creating…" : "Create invoice"}
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
