"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  Building2,
  Calendar,
  FileUp,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  User,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { COUNTRY_OPTIONS, NATIONALITY_OPTIONS } from "@repo/types"

type ClientEditData = {
  id: string
  companyName: string
  contactName: string | null
  email: string | null
  phone: string | null
  nationality: string | null
  tradeLicenseNumber: string | null
  city: string | null
  country: string | null
  status: string | null
  renewalDate: string | null
  renewalState: string
  notes: string | null
}

const CLIENT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "watchlist", label: "Watchlist" },
  { value: "inactive", label: "Inactive" },
] as const

function toInputDate(value: string | null) {
  if (!value) return ""
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10)
}

function formatDate(value: string | null) {
  if (!value) return "Not tracked"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Not tracked"
  return parsed.toLocaleDateString("en-AE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatLabel(value: string | null | undefined) {
  return value?.replace(/_/g, " ") || "Not set"
}

function ViewField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 break-words text-sm font-medium leading-6 text-foreground">
        {value || <span className="text-muted-foreground/60">-</span>}
      </p>
    </div>
  )
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

export function ClientEditCard({ client }: { client: ClientEditData }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [fileName, setFileName] = useState("")
  const [form, setForm] = useState({
    companyName: client.companyName,
    contactName: client.contactName ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    nationality: client.nationality ?? "",
    tradeLicenseNumber: client.tradeLicenseNumber ?? "",
    city: client.city ?? "",
    country: client.country ?? "",
    status: client.status ?? "active",
    renewalDate: toInputDate(client.renewalDate),
    notes: client.notes ?? "",
  })

  const resetForm = () => {
    setFileName("")
    setForm({
      companyName: client.companyName,
      contactName: client.contactName ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      nationality: client.nationality ?? "",
      tradeLicenseNumber: client.tradeLicenseNumber ?? "",
      city: client.city ?? "",
      country: client.country ?? "",
      status: client.status ?? "active",
      renewalDate: toInputDate(client.renewalDate),
      notes: client.notes ?? "",
    })
  }

  const update = (name: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const cancel = () => {
    resetForm()
    setEditing(false)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    const payload = new FormData(event.currentTarget)
    try {
      const response = await fetch(`/api/partner-clients/${client.id}`, {
        method: "PATCH",
        body: payload,
        headers: { Accept: "application/json" },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? "Failed to update client.")

      toast.success("Client updated.")
      setEditing(false)
      startTransition(() => router.refresh())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update client.")
    } finally {
      setSaving(false)
    }
  }

  const showSpinner = saving || isPending

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-foreground">Client details</h2>
          {editing ? (
            <p className="mt-1 text-xs font-medium text-primary">Editing - make changes below</p>
          ) : (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">The saved profile for this client.</p>
          )}
        </div>

        {editing ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button type="button" onClick={cancel} className="secondary-button h-9 px-3" disabled={showSpinner}>
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button type="submit" className="primary-button h-9 px-3" disabled={showSpinner}>
              {showSpinner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="secondary-button h-10 px-4">
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <EditField label="Company">
              <input required name="companyName" value={form.companyName} onChange={(event) => update("companyName", event.target.value)} placeholder="Company name" className="field-input" />
            </EditField>
            <EditField label="Primary contact">
              <input required name="contactName" value={form.contactName} onChange={(event) => update("contactName", event.target.value)} placeholder="Contact name" className="field-input" />
            </EditField>
            <EditField label="Email">
              <input name="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="name@company.com" className="field-input" />
            </EditField>
            <EditField label="Phone">
              <input name="phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+971 50 000 0000" className="field-input" />
            </EditField>
            <EditField label="Nationality">
              <select name="nationality" value={form.nationality} onChange={(event) => update("nationality", event.target.value)} className="field-input">
                <option value="">Select nationality</option>
                {NATIONALITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </EditField>
            <EditField label="Country">
              <select name="country" value={form.country} onChange={(event) => update("country", event.target.value)} className="field-input">
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </EditField>
            <EditField label="City">
              <input name="city" value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="Dubai" className="field-input" />
            </EditField>
            <EditField label="Status">
              <select name="status" value={form.status} onChange={(event) => update("status", event.target.value)} className="field-input">
                {CLIENT_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </EditField>
            <EditField label="Trade license number">
              <input name="tradeLicenseNumber" value={form.tradeLicenseNumber} onChange={(event) => update("tradeLicenseNumber", event.target.value)} placeholder="TL-123456" className="field-input" />
            </EditField>
            <EditField label="Renewal date">
              <input name="renewalDate" type="date" value={form.renewalDate} onChange={(event) => update("renewalDate", event.target.value)} className="field-input" />
            </EditField>
          </div>

          <label className="block">
            <span className="field-label">Trade license upload</span>
            <span className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-5 text-center transition-colors hover:border-primary/40 hover:bg-secondary/70">
              <FileUp className="h-5 w-5 text-primary" />
              <span className="mt-2 text-sm font-medium text-foreground">{fileName || "Upload trade license"}</span>
              <span className="mt-1 text-xs text-muted-foreground">PDF, PNG, or JPG up to 8 MB</span>
              <input name="tradeLicenseFile" type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
            </span>
          </label>

          <label className="block">
            <span className="field-label">Notes</span>
            <textarea name="notes" rows={4} value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Renewal reminders, pricing details, or relationship notes..." className="field-textarea" />
          </label>
        </>
      ) : (
        <>
          <div className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
            <ViewField icon={Building2} label="Company" value={client.companyName} />
            <ViewField icon={User} label="Primary contact" value={client.contactName} />
            <ViewField icon={Mail} label="Email" value={client.email} />
            <ViewField icon={Phone} label="Phone" value={client.phone} />
            <ViewField icon={User} label="Nationality" value={client.nationality} />
            <ViewField icon={Building2} label="Trade license number" value={client.tradeLicenseNumber} />
            <ViewField icon={MapPin} label="Location" value={[client.city, client.country].filter(Boolean).join(", ") || null} />
            <ViewField icon={Calendar} label="Renewal date" value={formatDate(client.renewalDate)} />
            <ViewField icon={Globe} label="Lifecycle status" value={formatLabel(client.status)} />
            <ViewField icon={Calendar} label="Renewal state" value={formatLabel(client.renewalState)} />
          </div>

          <div className="border-t border-border pt-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Notes</p>
            <p className="mt-3 text-sm leading-7 text-foreground/90">
              {client.notes?.trim() || "No notes saved for this client yet."}
            </p>
          </div>
        </>
      )}
    </form>
  )
}