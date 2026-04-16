import { currentUser } from "@repo/auth/server"
import { redirect } from "next/navigation"
import { PartnerPasswordResetCard } from "@/components/partner-password-reset-card"

export default async function SettingsPage() {
  const user = await currentUser()

  if (!user?.email) {
    redirect("/sign-in")
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="mt-2 text-sm text-[var(--portal-text-soft)]">
          Manage your account access and security preferences.
        </p>
      </div>

      <PartnerPasswordResetCard email={user.email} />
    </div>
  )
}
