"use client"

import dynamic from "next/dynamic"
import { User } from "lucide-react"

const AvatarUploadInner = dynamic(
  () => import("./avatar-upload").then((m) => m.AvatarUpload),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.65rem] border border-border bg-gradient-to-br from-secondary via-secondary/70 to-secondary/40 text-foreground shadow-[0_18px_40px_rgba(15,23,42,0.35)] sm:h-24 sm:w-24 sm:rounded-[2rem]">
        <User className="h-8 w-8 sm:h-10 sm:w-10" />
      </div>
    ),
  }
)

export function AvatarUploadWrapper({
  profileImageUrl,
}: {
  profileImageUrl: string | null | undefined
}) {
  return <AvatarUploadInner profileImageUrl={profileImageUrl} />
}
