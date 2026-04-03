"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import {
  ACCESS_MODULES,
  ROLE_DEFAULT_PERMISSIONS,
  TEAM_ROLE_OPTIONS,
  type AccessLevel,
  type CanonicalTeamRole,
} from "@/lib/rbac"

const SCOPES = [
  { value: "all",  label: "All records" },
  { value: "team", label: "Team records" },
  { value: "own",  label: "Own records only" },
] as const

type PermMap = Record<string, AccessLevel>

export default function EditUserPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    designation: "",
    role: "viewer" as CanonicalTeamRole,
    rowScope: "all" as (typeof SCOPES)[number]["value"],
  })
  const [perms, setPerms] = useState<PermMap>({})

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/users?id=${id}`)
        if (!res.ok) throw new Error("Not found")
        const data = await res.json()
        const role: CanonicalTeamRole = data.role ?? "viewer"
        const defaultPerms = ROLE_DEFAULT_PERMISSIONS[role] ?? {}
        const savedPerms: PermMap =
          typeof data.permissions === "string"
            ? JSON.parse(data.permissions)
            : (data.permissions ?? {})
        setForm({
          name: data.name ?? "",
          designation: data.designation ?? "",
          role,
          rowScope: data.rowScope ?? "all",
        })
        setPerms({ ...defaultPerms, ...savedPerms })
      } catch {
        toast.error("Failed to load user")
        router.push("/settings/users")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  function handleRoleChange(role: CanonicalTeamRole) {
    setForm((f) => ({ ...f, role }))
    setPerms({ ...ROLE_DEFAULT_PERMISSIONS[role] })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, permissions: perms }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to update user")
      }
      toast.success("User updated")
      router.push("/settings/users")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500 text-sm">Loading…</p>
      </div>
    )
  }

  const selectedRole = TEAM_ROLE_OPTIONS.find((r) => r.value === form.role)

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
          <h1 className="text-2xl font-bold text-white">Edit User</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Update role, scope, and module permissions.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Identity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name *">
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <Field label="Designation">
              <input
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                placeholder="Business Development Manager"
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        {/* Role & scope */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Role &amp; Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Role *">
              <select
                value={form.role}
                onChange={(e) => handleRoleChange(e.target.value as CanonicalTeamRole)}
                className={selectCls}
              >
                {TEAM_ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Row Scope">
              <select
                value={form.rowScope}
                onChange={(e) => setForm((f) => ({ ...f, rowScope: e.target.value as typeof form.rowScope }))}
                className={selectCls}
              >
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

        {/* Module permissions */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-sm">Module Permissions</h2>
          <div className="divide-y divide-zinc-800">
            {ACCESS_MODULES.map((mod) => (
              <div key={mod} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-zinc-300 text-sm capitalize">{mod}</span>
                <div className="flex items-center gap-1 rounded-lg border border-zinc-700 overflow-hidden">
                  {(["", "r", "rw"] as AccessLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setPerms((p) => ({ ...p, [mod]: level }))}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        perms[mod] === level
                          ? level === ""
                            ? "bg-zinc-700 text-zinc-300"
                            : level === "r"
                              ? "bg-blue-600 text-white"
                              : "bg-green-700 text-white"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      {level === "" ? "None" : level === "r" ? "Read" : "Read/Write"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
            {saving ? "Saving…" : "Save Changes"}
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
