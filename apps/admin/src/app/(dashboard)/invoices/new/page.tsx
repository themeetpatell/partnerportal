import { redirect } from "next/navigation"
import { currentUser } from "@repo/auth/server"
import { db, partners, leads } from "@repo/db"
import { and, desc, eq, isNull } from "drizzle-orm"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, FINANCE_ROLES } from "@/lib/rbac"
import { resolvePartnerScopeForActor, partnerScopeWhere } from "@/lib/row-scope"
import { NewInvoiceForm } from "./form"

export default async function NewInvoicePage() {
  const tenantId = getRequiredTenantId()
  const [activeMember, sessionUser] = await Promise.all([
    getCurrentActiveTeamMember(),
    currentUser(),
  ])
  if (!activeMember || !hasAnyTeamRole(activeMember.role, FINANCE_ROLES)) {
    redirect("/invoices")
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
  const leadPartnerClause = partnerScopeWhere(rowScope, leads.partnerId)

  const [partnersList, billableLeads] = await Promise.all([
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
        id: leads.id,
        partnerId: leads.partnerId,
        customerCompany: leads.customerCompany,
        customerName: leads.customerName,
        status: leads.status,
      })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, tenantId),
          isNull(leads.deletedAt),
          leadPartnerClause ?? undefined,
        ),
      )
      .orderBy(desc(leads.createdAt))
      .limit(2500),
  ])

  return <NewInvoiceForm partners={partnersList} billableLeads={billableLeads} />
}
