"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2, Pencil, Save, Tag, X } from "lucide-react"

type SelectOption = { label: string; value: string }

export type LeadFieldDef =
  | {
      kind: "text" | "email" | "tel" | "number"
      name: string
      label: string
      placeholder?: string
      required?: boolean
      colSpan?: 1 | 2
    }
  | {
      kind: "select"
      name: string
      label: string
      options: readonly SelectOption[]
      placeholder?: string
      colSpan?: 1 | 2
    }
  | {
      kind: "textarea"
      name: string
      label: string
      rows?: number
      placeholder?: string
      colSpan?: 1 | 2
    }
  | {
      kind: "multiselect"
      name: string
      label: string
      options: readonly string[]
      colSpan?: 1 | 2
    }
  | {
      kind: "readonlyDate"
      name: string
      label: string
      colSpan?: 1 | 2
    }
  | {
      kind: "readonlyText"
      name: string
      label: string
      colSpan?: 1 | 2
    }

type FieldValue = string | string[] | null

type Props = {
  leadId: string
  title: string
  description?: string
  icon?: React.ReactNode
  fields: readonly LeadFieldDef[]
  initialValues: Record<string, FieldValue>
  canEdit: boolean
}

const dateFmt: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
}

const currencyFmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 2,
})

function formatReadonlyDate(raw: FieldValue): string {
  if (!raw || Array.isArray(raw)) return "—"
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleDateString("en-AE", dateFmt)
}

function formatNumberDisplay(name: string, raw: FieldValue): string {
  if (!raw || Array.isArray(raw)) return "—"
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return raw
  if (/Amount$/.test(name) || name === "budgetAmount") {
    return currencyFmt.format(parsed)
  }
  return String(parsed)
}

function ViewValue({ field, value }: { field: LeadFieldDef; value: FieldValue }) {
  const dash = <span className="text-slate-600">—</span>

  if (field.kind === "readonlyDate") {
    return <p className="text-sm text-white">{formatReadonlyDate(value)}</p>
  }

  if (field.kind === "readonlyText") {
    if (!value || Array.isArray(value)) return <p className="text-sm">{dash}</p>
    return <p className="text-sm text-white">{value}</p>
  }

  if (field.kind === "multiselect") {
    const list = Array.isArray(value) ? value : []
    if (list.length === 0) return <p className="text-sm">{dash}</p>
    return (
      <div className="flex flex-wrap gap-1.5">
        {list.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-300"
          >
            <Tag className="h-3 w-3 text-slate-500" />
            {s}
          </span>
        ))}
      </div>
    )
  }

  if (field.kind === "textarea") {
    if (!value || Array.isArray(value)) return <p className="text-sm">{dash}</p>
    return (
      <p className="whitespace-pre-wrap break-words text-sm text-zinc-200">
        {value}
      </p>
    )
  }

  if (field.kind === "number") {
    return <p className="text-sm text-white">{formatNumberDisplay(field.name, value)}</p>
  }

  if (field.kind === "select") {
    if (!value || Array.isArray(value)) return <p className="text-sm">{dash}</p>
    const match = field.options.find((o) => o.value === value)
    return <p className="text-sm capitalize text-white">{match?.label ?? value.replace(/_/g, " ")}</p>
  }

  if (!value || Array.isArray(value)) return <p className="text-sm">{dash}</p>
  return <p className="break-words text-sm text-white">{value}</p>
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
      {children}
    </p>
  )
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-indigo-400/60 focus:outline-none"

function EditField({
  field,
  value,
  onChange,
}: {
  field: LeadFieldDef
  value: FieldValue
  onChange: (next: FieldValue) => void
}) {
  if (field.kind === "readonlyDate" || field.kind === "readonlyText") {
    return <ViewValue field={field} value={value} />
  }

  if (field.kind === "multiselect") {
    const current = Array.isArray(value) ? value : []
    return (
      <select
        multiple
        value={current}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map((o) => o.value)
          onChange(selected)
        }}
        size={Math.min(8, Math.max(4, field.options.length))}
        className={inputClass}
      >
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  if (field.kind === "textarea") {
    const v = typeof value === "string" ? value : ""
    return (
      <textarea
        rows={field.rows ?? 3}
        value={v}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-none`}
      />
    )
  }

  if (field.kind === "select") {
    const v = typeof value === "string" ? value : ""
    return (
      <select
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">{field.placeholder ?? "Select…"}</option>
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }

  const inputType =
    field.kind === "email" ? "email" :
    field.kind === "tel" ? "tel" :
    field.kind === "number" ? "text" :
    "text"
  const v = typeof value === "string" ? value : ""
  return (
    <input
      type={inputType}
      value={v}
      placeholder={field.placeholder}
      required={field.kind !== "number" && field.required === true}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
      inputMode={field.kind === "tel" ? "tel" : field.kind === "number" ? "decimal" : undefined}
    />
  )
}

function colSpanClass(span: 1 | 2 | undefined) {
  return span === 2 ? "sm:col-span-2" : ""
}

export function LeadEditCard({
  leadId,
  title,
  description,
  icon,
  fields,
  initialValues,
  canEdit,
}: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, FieldValue>>({})

  const valueOf = (name: string): FieldValue => {
    if (name in draft) return draft[name]
    const initial = initialValues[name]
    return initial === undefined ? null : initial
  }

  const isDirty = (name: string) => name in draft

  const handleChange = (name: string, next: FieldValue) => {
    setDraft((prev) => ({ ...prev, [name]: next }))
  }

  const handleCancel = () => {
    setDraft({})
    setError(null)
    setIsEditing(false)
  }

  const handleSave = async () => {
    setError(null)

    const editableFields = fields.filter(
      (f) => f.kind !== "readonlyDate" && f.kind !== "readonlyText",
    )
    const dirtyFields = editableFields.filter((f) => isDirty(f.name))

    if (dirtyFields.length === 0) {
      setIsEditing(false)
      return
    }

    const formData = new FormData()
    let multiselectTouched = false
    for (const field of dirtyFields) {
      const value = valueOf(field.name)
      if (field.kind === "multiselect") {
        multiselectTouched = true
        const list = Array.isArray(value) ? value : []
        for (const v of list) formData.append(field.name, v)
        if (list.length === 0) {
          // ensure server sees the key so it processes the change
          formData.append(field.name, "")
        }
        continue
      }
      const stringValue = typeof value === "string" ? value : ""
      formData.append(field.name, stringValue)
    }

    // The server merges serviceInterestMulti + serviceInterestCustom together,
    // so if either was edited, send both so the merge produces the right result.
    if (multiselectTouched || dirtyFields.some((f) => f.name === "serviceInterestCustom")) {
      const ensure = (name: string) => {
        if (formData.has(name)) return
        const init = initialValues[name]
        if (name === "serviceInterestMulti" && Array.isArray(init)) {
          for (const v of init) formData.append(name, v)
          return
        }
        if (typeof init === "string") formData.append(name, init)
        else formData.append(name, "")
      }
      ensure("serviceInterestMulti")
      ensure("serviceInterestCustom")
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/details`, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(typeof data?.error === "string" ? data.error : "Failed to save changes.")
        setIsSaving(false)
        return
      }
      setIsEditing(false)
      setDraft({})
      setIsSaving(false)
      startTransition(() => router.refresh())
    } catch {
      setError("Network error. Please try again.")
      setIsSaving(false)
    }
  }

  const showSpinner = isSaving || isPending

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            {icon ? <span className="text-slate-400">{icon}</span> : null}
            {title}
          </h2>
          {isEditing ? (
            <p className="mt-1 text-xs font-medium text-indigo-300">
              Editing — make changes below
            </p>
          ) : description ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          ) : null}
        </div>

        {canEdit ? (
          isEditing ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleCancel}
                disabled={showSpinner}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.1] hover:text-white disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={showSpinner}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                {showSpinner ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className={colSpanClass(field.colSpan)}>
            <FieldLabel>{field.label}</FieldLabel>
            {isEditing ? (
              <EditField
                field={field}
                value={valueOf(field.name)}
                onChange={(next) => handleChange(field.name, next)}
              />
            ) : (
              <ViewValue field={field} value={valueOf(field.name)} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
