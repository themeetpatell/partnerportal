import { Suspense } from "react"
import { currentUser } from "@repo/auth/server"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/sidebar-nav"
import { PageSkeleton } from "@/components/page-skeleton"
import {
  getPartnerRecordByAuthUserId,
  hasApprovedWorkspaceAccess,
} from "@/lib/partner-record"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in")
  }

  const partnerRecord = await getPartnerRecordByAuthUserId(user.id)

  if (!partnerRecord) {
    redirect("/onboarding")
  }

  const userName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Partner"

  const userEmail = user.email || ""

  const userInitials =
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    userEmail.slice(0, 2).toUpperCase() ||
    "P"

  return (
    <div className="page-wrap min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 lg:gap-5">
        <SidebarNav
          userName={userName}
          userEmail={userEmail}
          userInitials={userInitials}
          hasWorkspaceAccess={hasApprovedWorkspaceAccess(partnerRecord)}
          partnerStatus={partnerRecord.status}
          contractStatus={partnerRecord.contractStatus}
          isOnboarded={Boolean(partnerRecord.onboardedAt)}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="surface-card-strong flex-1 rounded-[2rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <Suspense fallback={<PageSkeleton />}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
