import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AdminSidebarNav } from "@/components/admin-sidebar-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in")
  }

  const userName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.emailAddresses[0]?.emailAddress ||
    "Admin"

  const userEmail = user.emailAddresses[0]?.emailAddress || ""

  const userInitials =
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    userEmail.slice(0, 2).toUpperCase() ||
    "A"

  // Role is stored in public metadata; default to "Admin" for display
  const userRole =
    (user.publicMetadata?.role as string) || "Admin"

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col lg:flex-row">
      <AdminSidebarNav
        userName={userName}
        userEmail={userEmail}
        userInitials={userInitials}
        userRole={userRole}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
