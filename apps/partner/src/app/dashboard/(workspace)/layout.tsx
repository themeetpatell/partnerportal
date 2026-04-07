import { auth } from "@repo/auth/server"
import { redirect } from "next/navigation"
import {
  getPartnerRecordByAuthUserId,
  hasApprovedWorkspaceAccess,
} from "@/lib/partner-record"

export default async function PartnerWorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Use the lightweight auth-only check here.
  // The parent dashboard layout already fetched and validated the full
  // partner record (including the email-based fallback + linking).
  // We only need to confirm workspace access hasn't been revoked.
  const partner = await getPartnerRecordByAuthUserId(userId)

  if (!partner || !hasApprovedWorkspaceAccess(partner)) {
    redirect("/dashboard/profile")
  }

  return children
}
