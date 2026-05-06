import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, leads, partners, invoices, commissions, teamMembers } from "@repo/db"
import { eq, and, isNull, gte, lte } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, ANALYTICS_EXPORT_ROLES } from "@/lib/rbac"
import { resolvePartnerScopeForActor, scopedPartnerFilters } from "@/lib/row-scope"

function getDateRange(preset: string | undefined) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  switch (preset) {
    case "today":
      return { from: new Date(y, m, d), to: now }
    case "this_month":
      return { from: new Date(y, m, 1), to: now }
    case "last_month":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) }
    case "this_year":
      return { from: new Date(y, 0, 1), to: now }
    default:
      return {}
  }
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0]!)
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ]
  return lines.join("\n")
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`analytics-export:${userId}`, 10, 60_000)
  if (limited) return limited

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.authUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (!member || !hasAnyTeamRole(member.role, ANALYTICS_EXPORT_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()
  const scope = await resolvePartnerScopeForActor({
    tenantId,
    actorUserId: userId,
    member,
  })

  const url = new URL(req.url)
  const sp = url.searchParams
  const dateRange = getDateRange(sp.get("dateRange") ?? undefined)
  const partnerId = sp.get("partnerId")
  const partnerType = sp.get("partnerType")
  const leadStatus = sp.get("leadStatus")
  const leadSource = sp.get("leadSource")
  const teamMemberId = sp.get("teamMemberId")

  const leadScopeClause = scopedPartnerFilters(scope, leads.partnerId, partnerId)
  const invScopeClause = scopedPartnerFilters(scope, invoices.partnerId, partnerId)
  const commissionScopeClause = scopedPartnerFilters(scope, commissions.partnerId, partnerId)

  const dateFilter = (col: Parameters<typeof gte>[0]) => {
    const conditions = []
    if (dateRange.from) conditions.push(gte(col, dateRange.from))
    if (dateRange.to) conditions.push(lte(col, dateRange.to))
    return conditions
  }

  const [leadRows, commissionRows, invoiceRows] = await Promise.all([
    db
      .select({
        id: leads.id,
        customerName: leads.customerName,
        customerEmail: leads.customerEmail,
        customerCompany: leads.customerCompany,
        partnerType: partners.type,
        status: leads.status,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .innerJoin(partners, eq(leads.partnerId, partners.id))
      .where(
        and(
          eq(leads.tenantId, tenantId),
          eq(partners.tenantId, tenantId),
          isNull(leads.deletedAt),
          leadScopeClause ?? undefined,
          ...(partnerType ? [eq(partners.type, partnerType)] : []),
          ...(leadStatus ? [eq(leads.status, leadStatus)] : []),
          ...(leadSource ? [eq(leads.source, leadSource)] : []),
          ...(teamMemberId ? [eq(leads.assignedTo, teamMemberId)] : []),
          ...dateFilter(leads.createdAt),
        ),
      ),
    db
      .select({
        id: commissions.id,
        partnerType: partners.type,
        status: commissions.status,
        amount: commissions.amount,
        currency: commissions.currency,
        sourceType: commissions.sourceType,
        createdAt: commissions.createdAt,
      })
      .from(commissions)
      .innerJoin(partners, eq(commissions.partnerId, partners.id))
      .where(
        and(
          eq(commissions.tenantId, tenantId),
          eq(partners.tenantId, tenantId),
          commissionScopeClause ?? undefined,
          ...(partnerType ? [eq(partners.type, partnerType)] : []),
          ...dateFilter(commissions.createdAt),
        ),
      ),
    db
      .select({
        invoiceNumber: invoices.invoiceNumber,
        partnerType: partners.type,
        status: invoices.status,
        total: invoices.total,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
      })
      .from(invoices)
      .innerJoin(partners, eq(invoices.partnerId, partners.id))
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(partners.tenantId, tenantId),
          isNull(invoices.deletedAt),
          invScopeClause ?? undefined,
          ...(partnerType ? [eq(partners.type, partnerType)] : []),
          ...dateFilter(invoices.createdAt),
        ),
      ),
  ])

  const sections = [
    "LEADS",
    toCsv(leadRows as Record<string, unknown>[]),
    "",
    "COMMISSIONS",
    toCsv(commissionRows as Record<string, unknown>[]),
    "",
    "INVOICES",
    toCsv(invoiceRows as Record<string, unknown>[]),
  ].join("\n")

  return new NextResponse(sections, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="analytics-export-${Date.now()}.csv"`,
    },
  })
}
