import { currentUser } from "@clerk/nextjs/server"
import { CalendarDays, Sparkles } from "lucide-react"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/sidebar-nav"

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
    "Partner"

  const userEmail = user.emailAddresses[0]?.emailAddress || ""

  const userInitials =
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    userEmail.slice(0, 2).toUpperCase() ||
    "P"

  const today = new Intl.DateTimeFormat("en-AE", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date())

  return (
    <div className="page-wrap min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 lg:gap-5">
        <SidebarNav
          userName={userName}
          userEmail={userEmail}
          userInitials={userInitials}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="surface-card mb-4 flex flex-col gap-4 rounded-[1.75rem] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="eyebrow">
                <Sparkles className="h-3.5 w-3.5" />
                Partner workspace
              </div>
              <p className="mt-3 font-heading text-2xl font-semibold text-white">
                Operate leads, service requests, and earnings from one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="tag-pill">
                <CalendarDays className="h-4 w-4 text-[#8ce7db]" />
                {today}
              </div>
              <div className="tag-pill">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Workspace active
              </div>
            </div>
          </div>

          <div className="surface-card-strong flex-1 rounded-[2rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
