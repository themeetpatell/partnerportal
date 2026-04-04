"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, User, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AvatarUploadProps {
  profileImageUrl: string | null | undefined
}

export function AvatarUpload({ profileImageUrl }: AvatarUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(profileImageUrl ?? null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setUploading(true)

    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Upload failed.")
        setPreview(profileImageUrl ?? null)
        return
      }

      setPreview(data.url)
      toast.success("Profile picture updated.")
      router.refresh()
    } catch {
      toast.error("Upload failed. Please try again.")
      setPreview(profileImageUrl ?? null)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="relative shrink-0">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.65rem] border border-white/15 bg-gradient-to-br from-white/18 via-white/10 to-white/5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.35)] sm:h-24 sm:w-24 sm:rounded-[2rem]">
        {preview ? (
          <img
            src={preview}
            alt="Profile picture"
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="h-8 w-8 sm:h-10 sm:w-10" />
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-indigo-600 text-white shadow-lg transition-colors hover:bg-indigo-500 disabled:opacity-50"
        title="Change profile picture"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFile}
      />
    </div>
  )
}
