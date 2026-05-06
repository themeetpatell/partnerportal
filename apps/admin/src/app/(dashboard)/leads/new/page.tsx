import { currentUser } from "@repo/auth/server"
import { db, partners, services } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import {
  resolvePartnerScopeForActor,
  partnerScopeWhere,
} from "@/lib/row-scope"
import { NewLeadForm } from "./form"

export default async function NewLeadPage() {
  const tenantId = getRequiredTenantId()
  const [activeMember, sessionUser] = await Promise.all([
    getCurrentActiveTeamMember(),
    currentUser(),
  ])
  const rowScope =
    sessionUser?.id === undefined
      ? ({ kind: "restricted" as const, partnerIds: [] as readonly string[] })
      : await resolvePartnerScopeForActor({
          tenantId,
          actorUserId: sessionUser.id,
          member: activeMember,
        })

  const scopeClause = partnerScopeWhere(rowScope, partners.id)

  const [partnersList, servicesList] = await Promise.all([
    db
      .select({ id: partners.id, companyName: partners.companyName })
      .from(partners)
      .where(
        and(
          eq(partners.tenantId, tenantId),
          isNull(partners.deletedAt),
          scopeClause ?? undefined,
        ),
      )
      .orderBy(partners.companyName),
    db
      .select({ id: services.id, name: services.name })
      .from(services)
      .where(and(eq(services.tenantId, tenantId), eq(services.isActive, true)))
      .orderBy(services.name),
  ])

  return (
    <NewLeadForm
      partners={partnersList}
      services={servicesList}
    />
  )
}
