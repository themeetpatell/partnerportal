"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Bell, Camera, KeyRound, Loader2, Mail, Save, User } from "lucide-react"

export type AdminProfileInitial = {
  firstName: string
  lastName: string
  email: string
  phone: string
  designation: string
  avatarUrl: string | null
}

export function AdminProfileForm({
  initial,
  roleLabel,
}: {
  initial: AdminProfileInitial
  roleLabel: string
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.avatarUrl)
  const [notificationSettings, setNotificationSettings] = useState({
    inApp: true,
    email: true,
  })
  const [form, setForm] = useState({
    firstName: initial.firstName,
    lastName: initial.lastName,
    email: initial.email,
    phone: initial.phone,
    designation: initial.designation,
  })

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("admin-profile-notification-settings")
      if (!saved) return
      const parsed = JSON.parse(saved) as Partial<typeof notificationSettings>
      setNotificationSettings((settings) => ({
        inApp: typeof parsed.inApp === "boolean" ? parsed.inApp : settings.inApp,
        email: typeof parsed.email === "boolean" ? parsed.email : settings.email,
      }))
    } catch {
      /* ignore invalid local settings */
    }
  }, [])

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const localUrl = URL.createObjectURL(file)
    setAvatarPreview(localUrl)
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/admin/profile/avatar", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed.")
        setAvatarPreview(initial.avatarUrl)
        return
      }
      setAvatarPreview(data.url)
      toast.success("Profile picture updated.")
      router.refresh()
    } catch {
      toast.error("Upload failed.")
      setAvatarPreview(initial.avatarUrl)
    } finally {
      setUploadingAvatar(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || null,
          designation: form.designation || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Could not save")
      toast.success("Profile saved.")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function saveNotificationSettings() {
    setSavingNotifications(true)
    try {
      window.localStorage.setItem(
        "admin-profile-notification-settings",
        JSON.stringify(notificationSettings),
      )
      toast.success("Notification settings saved.")
    } finally {
      setSavingNotifications(false)
    }
  }

  async function resetPassword() {
    setResettingPassword(true)
    try {
      const res = await fetch("/api/admin/profile/reset-password", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Could not send reset link")
      toast.success("Password reset link sent.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset link")
    } finally {
      setResettingPassword(false)
    }
  }

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-white">Your profile</h1>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="surface-card rounded-2xl p-6 space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded URL from storage
                  <img src={avatarPreview} alt="Profile picture" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-slate-500" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-indigo-600 text-white shadow-lg transition-colors hover:bg-indigo-500 disabled:opacity-50"
                title="Change photo"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={handleAvatar}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-slate-400">First name</span>
                  <input
                    type="text"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={set("firstName")}
                    className={inputCls}
                    placeholder="Jane"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-slate-400">Last name</span>
                  <input
                    type="text"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={set("lastName")}
                    className={inputCls}
                    placeholder="Doe"
                  />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-400">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={set("email")}
                  className={inputCls}
                />
                <p className="text-[11px] text-slate-500">
                  This updates your sign-in email when supported by your workspace configuration.
                </p>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-slate-400">Phone</span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={set("phone")}
                    className={inputCls}
                    placeholder="+971 …"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-slate-400">Designation</span>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={set("designation")}
                    className={inputCls}
                    placeholder="Partnership Manager"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <p className="text-xs text-slate-500">
              <span className="text-slate-400">Role:</span> {roleLabel}
            </p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      <section className="surface-card rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Notification settings</h2>
            <p className="mt-1 text-sm text-slate-500">Choose where admin updates should appear.</p>
          </div>
          <button
            type="button"
            onClick={saveNotificationSettings}
            disabled={savingNotifications}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {savingNotifications ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-colors hover:border-indigo-500/35">
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                <Bell className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">In-app notifications</span>
                <span className="block text-sm text-slate-500">Dashboard bell center</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={notificationSettings.inApp}
              onChange={(event) =>
                setNotificationSettings((settings) => ({ ...settings, inApp: event.target.checked }))
              }
              className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/40"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-colors hover:border-indigo-500/35">
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                <Mail className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">Email notifications</span>
                <span className="block text-sm text-slate-500">Admin account emails</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={notificationSettings.email}
              onChange={(event) =>
                setNotificationSettings((settings) => ({ ...settings, email: event.target.checked }))
              }
              className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/40"
            />
          </label>
        </div>
      </section>

      <section className="surface-card rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Password</h2>
            <p className="mt-2 text-sm text-slate-500">Send a reset link to {form.email}.</p>
          </div>
          <button
            type="button"
            onClick={resetPassword}
            disabled={resettingPassword}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Reset password
          </button>
        </div>
      </section>
    </div>
  )
}
