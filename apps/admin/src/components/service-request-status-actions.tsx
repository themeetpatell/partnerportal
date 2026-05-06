"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import {
  SERVICE_REQUEST_STATUS_TRANSITIONS,
  type ServiceRequestStatus,
} from "@repo/types"

function labelize(status: ServiceRequestStatus) {
  return status.replace(/_/g, " ")
}

type Props = {
  requestId: string
  currentStatus: ServiceRequestStatus
  canManage: boolean
}

export function ServiceRequestStatusActions({ requestId, currentStatus, canManage }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busy, setBusy] = useState<ServiceRequestStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const nextStatuses = SERVICE_REQUEST_STATUS_TRANSITIONS[currentStatus] ?? []

  if (!canManage || nextStatuses.length === 0) {
    return null
  }

  const moveTo = async (next: ServiceRequestStatus) => {
    setError(null)
    setBusy(next)
    try {
      const res = await fetch(`/api/service-requests/${requestId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(typeof data?.error === "string" ? data.error : "Could not update status.")
        setBusy(null)
        return
      }
      setBusy(null)
      startTransition(() => router.refresh())
    } catch {
      setError("Network error. Try again.")
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p className="text-xs text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Update status
        </span>
        {nextStatuses.map((next) => (
          <button
            key={next}
            type="button"
            disabled={isPending || busy !== null}
            onClick={() => moveTo(next)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              next === "cancelled"
                ? "border-rose-800/50 bg-rose-950/40 text-rose-200 hover:bg-rose-900/40"
                : "border-white/12 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1] hover:text-white"
            }`}
          >
            {busy === next ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {labelize(next)}
          </button>
        ))}
      </div>
    </div>
  )
}
