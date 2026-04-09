import { redirect } from "next/navigation"
import {
  getCurrentPartnerRecord,
  hasApprovedWorkspaceAccess,
} from "@/lib/partner-record"

export default async function PartnerWorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const partner = await getCurrentPartnerRecord()

  if (!partner || !hasApprovedWorkspaceAccess(partner)) {
    redirect("/dashboard/profile")
  }

  return children
}
