import { redirect } from "next/navigation"
import { currentUser } from "@repo/auth/server"
import { db, partners, services, leads, teamMembers } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasModuleAccess } from "@/lib/rbac"
import {
  resolvePartnerScopeForActor,
  partnerScopeWhere,
} from "@/lib/row-scope"
import { NewServiceRequestForm } from "./form"

export default async function NewServiceRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ partnerId?: string }>
}) {
  const { partnerId: partnerIdFromUrl } = await searchParams
  const tenantId = getRequiredTenantId()
  const [activeMember, sessionUser] = await Promise.all([
    getCurrentActiveTeamMember(),
    currentUser(),
  ])

  if (
    !activeMember ||
    !hasModuleAccess(activeMember.role, activeMember.permissions, "services", "rw")
  ) {
    redirect("/service-requests")
  }
  const rowScope =
    sessionUser?.id === undefined
      ? ({ kind: "restricted" as const, partnerIds: [] as readonly string[] })
      : await resolvePartnerScopeForActor({
          tenantId,
          actorUserId: sessionUser.id,
          member: activeMember,
        })

  const partnerClause = partnerScopeWhere(rowScope, partners.id)
  const leadsPartnerClause = partnerScopeWhere(rowScope, leads.partnerId)

  const [partnersList, servicesList, leadsList, membersList] = await Promise.all([
    db
      .select({ id: partners.id, companyName: partners.companyName })
      .from(partners)
      .where(
        and(
          eq(partners.tenantId, tenantId),
          isNull(partners.deletedAt),
          partnerClause ?? undefined,
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
        customerName: leads.customerName,
        customerCompany: leads.customerCompany,
        partnerId: leads.partnerId,
      })
      .from(leads)
      .where(
        and(eq(leads.tenantId, tenantId), isNull(leads.deletedAt), leadsPartnerClause ?? undefined),
      )
      .orderBy(leads.createdAt),
    db
      .select({ authUserId: teamMembers.authUserId, name: teamMembers.name })
      .from(teamMembers)
      .where(and(eq(teamMembers.tenantId, tenantId), eq(teamMembers.isActive, true)))
      .orderBy(teamMembers.name),
  ])

  const initialPartnerId =
    partnerIdFromUrl && partnersList.some((p) => p.id === partnerIdFromUrl)
      ? partnerIdFromUrl
      : undefined

  return (
    <NewServiceRequestForm
      partners={partnersList}
      services={servicesList}
      leads={leadsList}
      teamMembers={membersList}
      initialPartnerId={initialPartnerId}
    />
  )
}
