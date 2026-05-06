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
  return date.toLocaleDateString("en-AE", { day: "numeric", month: "short" })
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let active = true
    fetch("/api/notifications")
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

  const unreadCount = useMemo(
    () => items.filter((item) => item.isRead !== "true").length,
    [items],
  )

  const markRead = () => {
    startTransition(async () => {
      await fetch("/api/notifications", { method: "PATCH" }).catch(() => null)
      setItems((current) => current.map((item) => ({ ...item, isRead: "true" })))
    })
  }

  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/60 text-foreground transition-colors hover:bg-secondary"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-30 w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-heading text-sm font-semibold text-foreground">Notifications</p>
              <p className="mt-0.5 text-xs text-muted-foreground">All in-app updates for your workspace</p>
            </div>
            <button
              type="button"
              onClick={markRead}
              disabled={isPending || unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Read
            </button>
          </div>

          <div className="max-h-96 overflow-auto p-2">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading notifications...</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-xl px-3 py-3 transition-colors hover:bg-secondary/50">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{formatNotificationDate(item.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
                  {item.isRead !== "true" ? (
                    <span className="mt-2 inline-flex rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary">New</span>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}