import { Suspense } from "react"
import { currentUser } from "@repo/auth/server"
import { redirect } from "next/navigation"
import { AdminSidebarNav } from "@/components/admin-sidebar-nav"
import { PageSkeleton } from "@/components/page-skeleton"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"

// Dashboard pages use cookies + DB — must be dynamic.
// Placed here (not root layout) so auth pages like sign-in can still be static.
export const dynamic = "force-dynamic"

function formatRoleLabel(role: string | null | undefined) {
  if (!role) {
    return "Admin"
  }

  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, teamMember] = await Promise.all([
    currentUser(),
    getCurrentActiveTeamMember(),
  ])

  if (!user?.id) {
    redirect("/sign-in")
  }

  if (!teamMember) {
    redirect("/sign-in")
  }

  const userName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Admin"

  const userEmail = user.email || ""

  const userInitials =
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    userEmail.slice(0, 2).toUpperCase() ||
    "A"

  const userRole = formatRoleLabel(teamMember.role)

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row">
      <AdminSidebarNav
        userName={userName}
        userEmail={userEmail}
        userInitials={userInitials}
        userRole={userRole}
        teamRole={teamMember.role}
        teamPermissions={teamMember.permissions}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Suspense fallback={<PageSkeleton />}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  )
}
