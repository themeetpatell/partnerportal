import { auth } from "@repo/auth/server"
import { NextResponse } from "next/server"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import { db, leads, partners } from "@repo/db"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, FINANCE_ROLES } from "@/lib/rbac"
import { isPartnerReadable, resolvePartnerScopeForActor } from "@/lib/row-scope"

/** Leads that can be referenced on a commission invoice for this partner */
const BILLABLE_STATUSES = [
  "lead_qualified",
  "proposal_sent",
  "deal_won",
  "lead_follow_up",
  "lead_approved",
] as const

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, FINANCE_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()
  const { id: partnerId } = await params

  const scope = await resolvePartnerScopeForActor({
    tenantId,
    actorUserId: userId,
    member,
  })
  if (!isPartnerReadable(scope, partnerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [p] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(and(eq(partners.id, partnerId), eq(partners.tenantId, tenantId), isNull(partners.deletedAt)))
    .limit(1)
  if (!p) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

  const rows = await db
    .select({
      id: leads.id,
      customerName: leads.customerName,
      customerCompany: leads.customerCompany,
      status: leads.status,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(
      and(
        eq(leads.partnerId, partnerId),
        eq(leads.tenantId, tenantId),
        isNull(leads.deletedAt),
        inArray(leads.status, [...BILLABLE_STATUSES]),
      ),
    )
    .orderBy(desc(leads.createdAt))
    .limit(120)

  return NextResponse.json({ leads: rows })
}
