import { auth } from "@repo/auth/server"
import { listLeadCatalogItems } from "@repo/db"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, LEAD_SERVICE_CATALOG_SETTINGS_ROLES } from "@/lib/rbac"
import { LeadCatalogManager } from "./lead-catalog-manager"

export default async function LeadServicesSettingsPage() {
  const [{ userId }, member] = await Promise.all([auth(), getCurrentActiveTeamMember()])

  if (!userId) {
    redirect("/sign-in")
  }

  if (!member || !hasAnyTeamRole(member.role, LEAD_SERVICE_CATALOG_SETTINGS_ROLES)) {
    redirect("/settings/users")
  }

  const tenantId = getRequiredTenantId()
  const items = await listLeadCatalogItems(tenantId)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Lead services catalog</h1>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
            Control the picklist for “services of interest” on partner referrals and admin lead intake.
            Changes apply to new submissions; existing leads keep the labels they were saved with.
          </p>
        </div>
        <Link
          href="/settings/users"
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
        >
          ← Back to team
        </Link>
      </div>

      <LeadCatalogManager initialItems={items} />
    </div>
  )
}
