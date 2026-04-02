"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const ROLES = [
  { value: "admin",             label: "Admin",             desc: "Full access to all modules" },
  { value: "partnership",       label: "Partnership",       desc: "Partners, leads, services management" },
  { value: "sales",             label: "Sales",             desc: "Lead pipeline and conversions" },
  { value: "appointment_setter",label: "Appointment Setter",desc: "Create and edit leads only" },
  { value: "finance",           label: "Finance",           desc: "Invoices and commissions" },
  { value: "viewer",            label: "Viewer",            desc: "Read-only analytics" },
] as const

const SCOPES = [
  { value: "all",  label: "All records" },
  { value: "team", label: "Team records" },
  { value: "own",  label: "Own records only" },
] as const

export default function NewUserPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    role: "sales" as (typeof ROLES)[number]["value"],
    rowScope: "all" as (typeof SCOPES)[number]["value"],
  })

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create user")
      toast.success("User created")
      router.push("/settings/users")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const selectedRole = ROLES.find((r) => r.value === form.role)

  return (
    <div className="max-w-xl space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/settings/users"
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Add Team Member</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Create the team member record first. Internal identity is generated automatically.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Identity</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name *">
                <input required value={form.name} onChange={set("name")} placeholder="Jane Smith" className={inputCls} />
              </Field>
              <Field label="Email *">
                <input required type="email" value={form.email} onChange={set("email")} placeholder="jane@company.com" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone Number">
                <input value={form.phone} onChange={set("phone")} placeholder="+971 50 000 0000" className={inputCls} />
              </Field>
              <Field label="Designation">
                <input value={form.designation} onChange={set("designation")} placeholder="Business Development Manager" className={inputCls} />
              </Field>
            </div>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Role &amp; Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Role *">
              <select value={form.role} onChange={set("role")} className={selectCls}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Row Scope">
              <select value={form.rowScope} onChange={set("rowScope")} className={selectCls}>
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
          </div>
          {selectedRole && (
            <p className="text-zinc-500 text-xs px-1">
              <span className="text-zinc-400 font-medium">{selectedRole.label}:</span>{" "}
              {selectedRole.desc}
            </p>
          )}
        </section>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/settings/users" className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? "Adding…" : "Add User"}
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
