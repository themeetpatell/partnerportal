"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, PauseCircle, RotateCcw } from "lucide-react"

type ActionButtonProps = {
  partnerId: string
  action: string
  endpoint: string
  label: string
  confirmLabel?: string
  variant: "green" | "red" | "yellow" | "slate"
  icon: "approve" | "reject" | "suspend" | "reactivate"
  extraBody?: Record<string, string>
}

const variantClasses: Record<ActionButtonProps["variant"], string> = {
  green: "bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700",
  red: "bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:text-red-700",
  yellow: "bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-900 disabled:text-yellow-700",
  slate: "bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-slate-600",
}

const icons = {
  approve: CheckCircle,
  reject: XCircle,
  suspend: PauseCircle,
  reactivate: RotateCcw,
}

export function PartnerActionButton({
  action,
  endpoint,
  label,
  confirmLabel,
  variant,
  icon,
  extraBody = {},
}: ActionButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const Icon = icons[icon]

  async function handleClick() {
    if (confirmLabel && !window.confirm(confirmLabel)) return
    setLoading(true)
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraBody }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed ${variantClasses[variant]}`}
    >
      <Icon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Processing…" : label}
    </button>
  )
}

type RejectFormProps = {
  partnerId: string
  endpoint?: string
  buttonLabel?: string
}

export function PartnerRejectForm({
  partnerId,
  endpoint,
  buttonLabel = "Reject application",
}: RejectFormProps) {
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState("")
  const router = useRouter()
  const resolvedEndpoint = endpoint ?? `/api/partners/${partnerId}/reject`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(resolvedEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="mt-4 block">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Optional reason
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Explain why the application cannot be approved right now."
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-900 disabled:text-red-700"
      >
        <XCircle className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Processing…" : buttonLabel}
      </button>
    </form>
  )
}
