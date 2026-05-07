import { auth } from "@repo/auth/server"
import { redirect } from "next/navigation"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import {
  hasAnyTeamRole,
  LEAD_SERVICE_CATALOG_SETTINGS_ROLES,
  USER_MANAGEMENT_ROLES,
} from "@/lib/rbac"

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in")
  }

  const member = await getCurrentActiveTeamMember()

  if (member && hasAnyTeamRole(member.role, USER_MANAGEMENT_ROLES)) {
    redirect("/settings/users")
  }

  if (member && hasAnyTeamRole(member.role, LEAD_SERVICE_CATALOG_SETTINGS_ROLES)) {
    redirect("/settings/lead-services")
  }

  redirect("/settings/users")
}
