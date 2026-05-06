"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"

type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  isRead: string
  createdAt: string
}

function formatNotificationDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-AE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function AdminNotificationCenter({ dropUp }: { dropUp?: boolean }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let active = true
    fetch("/api/admin/notifications")
      .then((response) => response.json())
      .then((data) => {
        if (active) setItems(data.notifications ?? [])
      })
      .catch(() => {
        if (active) setItems([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const unreadCount = useMemo(() => items.filter((item) => item.isRead !== "true").length, [items])

  const markRead = () => {
    startTransition(async () => {
      await fetch("/api/admin/notifications", { method: "PATCH" }).catch(() => null)
      setItems((current) => current.map((item) => ({ ...item, isRead: "true" })))
    })
  }

  return (
    <div className={`relative flex ${dropUp ? "justify-center w-full" : "justify-end"}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`absolute z-50 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl ${
            dropUp
              ? "left-1/2 bottom-full mb-2 -translate-x-1/2"
              : "right-0 top-11"
          }`}
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-zinc-100">Activity</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">Recent updates across your tenant</p>
            </div>
            <button
              type="button"
              onClick={markRead}
              disabled={isPending || unreadCount === 0}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-40"
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
              Clear
            </button>
          </div>

          <div className="max-h-80 overflow-auto p-2">
            {loading ? (
              <div className="px-3 py-6 text-center text-xs text-zinc-500">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-zinc-500">No recent activity.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-lg px-2.5 py-2 transition-colors hover:bg-zinc-800/80">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-zinc-200">{item.title}</p>
                    <span className="shrink-0 text-[10px] text-zinc-600">{formatNotificationDate(item.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{item.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
