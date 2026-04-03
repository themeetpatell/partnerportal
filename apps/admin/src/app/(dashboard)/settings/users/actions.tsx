"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MoreHorizontal } from "lucide-react"

export function UserActionsMenu({
  memberId,
  isActive,
}: {
  memberId: string
  isActive: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    setOpen(false)
    try {
      const res = await fetch(`/api/admin/users?id=${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (!res.ok) throw new Error("Failed to update user")
      toast.success(isActive ? "User deactivated" : "User activated")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={() => {
                setOpen(false)
                router.push(`/settings/users/${memberId}/edit`)
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Edit permissions
            </button>
            <div className="h-px bg-zinc-700" />
            <button
              onClick={toggle}
              className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              {isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
