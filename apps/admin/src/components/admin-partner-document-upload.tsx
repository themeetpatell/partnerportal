"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileUp, Loader2 } from "lucide-react"

export type PartnerAdminDocumentType = "trade_license" | "emirates_id" | "passport"

export function AdminPartnerDocumentUpload({
  partnerId,
  label,
  documentType,
  disabled,
}: {
  partnerId: string
  label: string
  documentType: PartnerAdminDocumentType
  disabled?: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    setPending(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("documentType", documentType)
      const res = await fetch(`/api/partners/${partnerId}/documents`, {
        method: "POST",
        body: fd,
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Upload failed.")
        return
      }
      router.refresh()
    } catch {
      setError("Network error.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <label className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          onChange={onChange}
          disabled={disabled || pending}
          className="block w-full max-w-full text-xs text-zinc-300 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-200 hover:file:bg-zinc-600 disabled:opacity-50"
        />
        {pending ? <Loader2 className="h-4 w-4 animate-spin text-indigo-400" /> : <FileUp className="h-4 w-4 text-zinc-600" />}
      </div>
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
      <p className="mt-1 text-[11px] text-zinc-600">PDF, PNG, or JPG · max 8 MB</p>
    </div>
  )
}
