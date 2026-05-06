"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Bell, Loader2, Mail, Save } from "lucide-react"
import { toast } from "sonner"

type Props = {
  emailOptOut: boolean
}

export function NotificationSettingsCard({ emailOptOut }: Props) {
  const router = useRouter()
  const [emailEnabled, setEmailEnabled] = useState(!emailOptOut)
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOptOut: !emailEnabled }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? "Failed to save notification settings.")

      toast.success("Notification settings updated.")
      startTransition(() => router.refresh())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save notification settings.")
    } finally {
      setSaving(false)
    }
  }

  const showSpinner = saving || isPending

  return (
    <section className="surface-card rounded-[2rem] p-6 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Notification settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose where partner updates should appear.</p>
        </div>
        <button type="button" onClick={save} disabled={showSpinner} className="primary-button h-10 px-4">
          {showSpinner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/40 px-4 py-4">
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Bell className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">In-app notifications</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Dashboard bell center</span>
            </span>
          </span>
          <input type="checkbox" checked readOnly className="h-4 w-4 rounded border-border bg-secondary text-primary" />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/40 px-4 py-4">
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Mail className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Email notifications</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Partner account emails</span>
            </span>
          </span>
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(event) => setEmailEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-border bg-secondary text-primary"
          />
        </label>
      </div>
    </section>
  )
}