import { currentUser } from "@repo/auth/server"
import { db, partners, serviceRequests } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import {
  resolvePartnerScopeForActor,
  partnerScopeWhere,
} from "@/lib/row-scope"
import { NewInvoiceForm } from "./form"

export default async function NewInvoicePage() {
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

  const partnerClause = partnerScopeWhere(rowScope, partners.id)
  const srPartnerClause = partnerScopeWhere(rowScope, serviceRequests.partnerId)

  const [partnersList, srList] = await Promise.all([
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
      .select({
        id: serviceRequests.id,
        customerCompany: serviceRequests.customerCompany,
        partnerId: serviceRequests.partnerId,
        status: serviceRequests.status,
      })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.tenantId, tenantId),
          isNull(serviceRequests.deletedAt),
          srPartnerClause ?? undefined,
        ),
      )
      .orderBy(serviceRequests.createdAt),
  ])

  return <NewInvoiceForm partners={partnersList} serviceRequests={srList} />
}
