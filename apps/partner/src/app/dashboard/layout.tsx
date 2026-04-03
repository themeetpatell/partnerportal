import { Suspense } from "react"
import { currentUser } from "@repo/auth/server"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/sidebar-nav"
import { PageSkeleton } from "@/components/page-skeleton"
import {
  getPartnerRecordForAuthenticatedUser,
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

  const partnerRecord = await getPartnerRecordForAuthenticatedUser({
    userId: user.id,
    email: user.email,
  })

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
    <div className="page-wrap min-h-screen px-3 pt-3 pb-24 sm:px-6 sm:pt-4 sm:pb-6 lg:px-8 lg:py-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1600px] flex-col gap-3 sm:min-h-[calc(100vh-2rem)] lg:flex-row lg:gap-5">
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
          <div className="surface-card-strong flex-1 rounded-[1.5rem] px-4 py-4 sm:rounded-[2rem] sm:px-6 sm:py-6 lg:px-8">
            <Suspense fallback={<PageSkeleton />}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
