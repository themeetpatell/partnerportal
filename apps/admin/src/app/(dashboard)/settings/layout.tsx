import { auth } from "@repo/auth/server"
import Link from "next/link"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import {
  hasAnyTeamRole,
  LEAD_SERVICE_CATALOG_SETTINGS_ROLES,
  USER_MANAGEMENT_ROLES,
} from "@/lib/rbac"

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [{ userId }, member] = await Promise.all([auth(), getCurrentActiveTeamMember()])

  const showUsers =
    Boolean(userId && member && hasAnyTeamRole(member.role, USER_MANAGEMENT_ROLES))
  const showLeadCatalog =
    Boolean(userId && member && hasAnyTeamRole(member.role, LEAD_SERVICE_CATALOG_SETTINGS_ROLES))

  return (
    <div>
      {(showUsers || showLeadCatalog) && (
        <nav className="flex flex-wrap gap-2 border-b border-zinc-800 pb-4 mb-8">
          {showUsers ? (
            <Link
              href="/settings/users"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
            >
              Users &amp; permissions
            </Link>
          ) : null}
          {showLeadCatalog ? (
            <Link
              href="/settings/lead-services"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
            >
              Lead services catalog
            </Link>
          ) : null}
        </nav>
      )}
      {children}
    </div>
  )
}
