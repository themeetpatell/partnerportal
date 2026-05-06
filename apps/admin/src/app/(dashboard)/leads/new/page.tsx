import { currentUser } from "@repo/auth/server"
import { db, leads, partners, services, teamMembers } from "@repo/db"
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
  const leadsScopeClause = partnerScopeWhere(rowScope, leads.partnerId)

  const [partnersList, servicesList, wonLeads, membersList] = await Promise.all([
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
      .select({ id: services.id, name: services.name, category: services.category })
      .from(services)
      .where(and(eq(services.tenantId, tenantId), eq(services.isActive, true)))
      .orderBy(services.name),
    db
      .select({
        id: leads.id,
        partnerId: leads.partnerId,
        customerName: leads.customerName,
        customerEmail: leads.customerEmail,
        customerCompany: leads.customerCompany,
      })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, tenantId),
          eq(leads.status, "deal_won"),
          isNull(leads.deletedAt),
          leadsScopeClause ?? undefined,
        ),
      )
      .orderBy(leads.createdAt),
    db
      .select({ authUserId: teamMembers.authUserId, name: teamMembers.name })
      .from(teamMembers)
      .where(and(eq(teamMembers.tenantId, tenantId), eq(teamMembers.isActive, true)))
      .orderBy(teamMembers.name),
  ])

  return (
    <NewLeadForm
      partners={partnersList}
      services={servicesList}
      wonLeads={wonLeads}
      teamMembers={membersList}
    />
  )
}
