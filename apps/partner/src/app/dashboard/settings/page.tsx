import { currentUser } from "@repo/auth/server"
import { redirect } from "next/navigation"
import { PartnerPasswordResetCard } from "@/components/partner-password-reset-card"
import { NotificationSettingsCard } from "@/components/notification-settings-card"
import { getCurrentPartnerRecord } from "@/lib/partner-record"

export default async function SettingsPage() {
  const [user, partner] = await Promise.all([currentUser(), getCurrentPartnerRecord()])

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

      <NotificationSettingsCard emailOptOut={Boolean(partner?.emailOptOut)} />

      <PartnerPasswordResetCard email={user.email} />
    </div>
  )
}
