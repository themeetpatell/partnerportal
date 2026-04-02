import { currentUser } from "@repo/auth/server"
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
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in")
  }

  const partner = await getPartnerRecordByAuthUserId(user.id)

  if (!partner) {
    redirect("/onboarding")
  }

  if (!hasApprovedWorkspaceAccess(partner)) {
    redirect("/dashboard/profile")
  }

  return children
}
