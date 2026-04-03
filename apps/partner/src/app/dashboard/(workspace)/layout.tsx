import { currentUser } from "@repo/auth/server"
import { redirect } from "next/navigation"
import {
  getPartnerRecordForAuthenticatedUser,
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

  const partner = await getPartnerRecordForAuthenticatedUser({
    userId: user.id,
    email: user.email,
  })

  if (!partner) {
    redirect("/onboarding")
  }

  if (!hasApprovedWorkspaceAccess(partner)) {
    redirect("/dashboard/profile")
  }

  return children
}
