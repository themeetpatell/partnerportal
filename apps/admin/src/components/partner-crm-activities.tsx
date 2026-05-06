"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Loader2,
  MapPin,
  Link as LinkIcon,
  Mail,
  Phone,
  Video,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react"

type ActivityRow = {
  id: string
  activityType: string
  subject: string
  description: string | null
  scheduledAt: string
  endAt: string | null
  durationMinutes: number | null
  location: string | null
  meetingUrl: string | null
  outcome: string | null
  status: string
  assignedToTeamMemberId: string | null
}

const TYPE_OPTIONS = [
  { value: "call", label: "Call" },
  { value: "meeting_in_person", label: "Meeting (in person)" },
  { value: "meeting_virtual", label: "Meeting (virtual)" },
  { value: "email", label: "Email" },
  { value: "task", label: "Task" },
] as const

function typeIcon(t: string) {
  switch (t) {
    case "call":
      return Phone
    case "meeting_in_person":
      return Users
    case "meeting_virtual":
      return Video
    case "email":
      return Mail
    default:
      return Calendar
  }
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-AE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function PartnerCrmActivities({
  partnerId,
  canManage,
  assignees,
}: {
  partnerId: string
  canManage: boolean
  assignees: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [items, setItems] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    activityType: "call" as (typeof TYPE_OPTIONS)[number]["value"],
    subject: "",
    description: "",
    scheduledAt: "",
    location: "",
    meetingUrl: "",
    assignedToTeamMemberId: "",
  })

  const readJson = async (res: Response) => {
    const text = await res.text()
    if (!text.trim()) return {}
    return JSON.parse(text) as Record<string, unknown>
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/partners/${partnerId}/crm-activities`)
      const data = await readJson(res)
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to load activities")
      setItems(Array.isArray(data.activities) ? data.activities as ActivityRow[] : [])
    } catch (e) {
      setItems([])
      setError(e instanceof SyntaxError ? "Failed to load activities." : e instanceof Error ? e.message : "Failed to load activities.")
    } finally {
      setLoading(false)
    }
  }, [partnerId])

  useEffect(() => {
    void load()
  }, [load])

  const { upcoming, past } = useMemo(() => {
    const now = Date.now()
    const up: ActivityRow[] = []
    const pa: ActivityRow[] = []
    for (const row of items) {
      const t = new Date(row.scheduledAt).getTime()
      if (row.status === "scheduled" && t >= now) up.push(row)
      else pa.push(row)
    }
    up.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    pa.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    return { upcoming: up, past: pa }
  }, [items])

  async function createActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subject.trim() || !form.scheduledAt) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/partners/${partnerId}/crm-activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: form.activityType,
          subject: form.subject.trim(),
          description: form.description.trim() || null,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          location: form.location.trim() || null,
          meetingUrl: form.meetingUrl.trim() || null,
          assignedToTeamMemberId: form.assignedToTeamMemberId || null,
        }),
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create activity")
      setShowForm(false)
      setForm({
        activityType: "call",
        subject: "",
        description: "",
        scheduledAt: "",
        location: "",
        meetingUrl: "",
        assignedToTeamMemberId: "",
      })
      await load()
      router.refresh()
    } catch (err) {
      setError(err instanceof SyntaxError ? "Could not create activity." : err instanceof Error ? err.message : "Could not create activity.")
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(id: string, status: "completed" | "cancelled" | "no_show") {
    try {
      const res = await fetch(`/api/partners/${partnerId}/crm-activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await readJson(res)
        throw new Error(typeof data.error === "string" ? data.error : "Update failed")
      }
      await load()
      router.refresh()
    } catch {
      /* toast optional */
    }
  }

  function ActivityCard({ row }: { row: ActivityRow }) {
    const Icon = typeIcon(row.activityType)
    const typeLabel = TYPE_OPTIONS.find((o) => o.value === row.activityType)?.label ?? row.activityType
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-800/80">
            <Icon className="h-4 w-4 text-indigo-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-white">{row.subject}</p>
              <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                {typeLabel}
              </span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                  row.status === "completed"
                    ? "bg-emerald-950/50 text-emerald-300 border border-emerald-800/40"
                    : row.status === "cancelled" || row.status === "no_show"
                      ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      : "bg-sky-950/50 text-sky-300 border border-sky-800/40"
                }`}
              >
                {row.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{formatWhen(row.scheduledAt)}</p>
            {row.description ? (
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">{row.description}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
              {row.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {row.location}
                </span>
              ) : null}
              {row.meetingUrl ? (
                <a
                  href={row.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                >
                  <LinkIcon className="h-3 w-3" />
                  Join link
                </a>
              ) : null}
            </div>
            {row.outcome ? (
              <p className="mt-2 text-[11px] text-slate-500">
                <span className="text-slate-600">Outcome:</span> {row.outcome}
              </p>
            ) : null}
            {canManage && row.status === "scheduled" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatus(row.id, "completed")}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-2 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-950/50"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Mark done
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(row.id, "cancelled")}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                >
                  <XCircle className="h-3 w-3" />
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : null}

      {canManage ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            {showForm ? "Close" : "Schedule"}
          </button>
        </div>
      ) : null}

      {showForm && canManage ? (
        <form onSubmit={createActivity} className="space-y-3 rounded-xl border border-indigo-800/30 bg-indigo-950/20 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Type</span>
              <select
                value={form.activityType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, activityType: e.target.value as (typeof f)["activityType"] }))
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">When</span>
              <input
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              />
            </label>
            <label className="sm:col-span-2 space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Subject</span>
              <input
                required
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Q2 review call with partner"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
              />
            </label>
            <label className="sm:col-span-2 space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Details</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Agenda, context, dial-in notes…"
                className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Location</span>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Office, city, or room"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Meeting URL</span>
              <input
                value={form.meetingUrl}
                onChange={(e) => setForm((f) => ({ ...f, meetingUrl: e.target.value }))}
                placeholder="https://…"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Assign to</span>
              <select
                value={form.assignedToTeamMemberId}
                onChange={(e) => setForm((f) => ({ ...f, assignedToTeamMemberId: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              >
                <option value="">— Anyone —</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save activity
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-8 text-slate-500 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Upcoming</h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-600 py-2">No scheduled activities.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((row) => (
                  <ActivityCard key={row.id} row={row} />
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">History</h3>
            {past.length === 0 ? (
              <p className="text-sm text-slate-600 py-2">No past activities yet.</p>
            ) : (
              <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                {past.map((row) => (
                  <ActivityCard key={row.id} row={row} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
