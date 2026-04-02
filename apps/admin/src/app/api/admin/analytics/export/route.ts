import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, leads, partners, serviceRequests, invoices, teamMembers } from "@repo/db"
import { eq, and, isNull, gte, lte } from "drizzle-orm"
import { rateLimit } from "@repo/auth"

function getDateRange(preset: string | undefined) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  switch (preset) {
    case "today": return { from: new Date(y, m, d), to: now }
    case "this_month": return { from: new Date(y, m, 1), to: now }
    case "last_month": return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) }
    case "this_year": return { from: new Date(y, 0, 1), to: now }
    default: return {}
  }
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0]!)
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ]
  return lines.join("\n")
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`analytics-export:${userId}`, 10, 60_000)
  if (limited) return limited

  // Verify role — only admin, partnership, finance can export analytics
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.clerkUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (!member || !["admin", "partnership", "finance"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const sp = url.searchParams
  const dateRange = getDateRange(sp.get("dateRange") ?? undefined)
  const partnerId = sp.get("partnerId")
  const partnerType = sp.get("partnerType")
  const leadStatus = sp.get("leadStatus")
  const leadSource = sp.get("leadSource")
  const serviceStatus = sp.get("serviceStatus")
  const teamMemberId = sp.get("teamMemberId")

  const dateFilter = (col: Parameters<typeof gte>[0]) => {
    const conditions = []
    if (dateRange.from) conditions.push(gte(col, dateRange.from))
    if (dateRange.to) conditions.push(lte(col, dateRange.to))
    return conditions
  }

  const [leadRows, srRows, invoiceRows] = await Promise.all([
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
          isNull(leads.deletedAt),
          ...(partnerId ? [eq(leads.partnerId, partnerId)] : []),
          ...(partnerType ? [eq(partners.type, partnerType)] : []),
          ...(leadStatus ? [eq(leads.status, leadStatus)] : []),
          ...(leadSource ? [eq(leads.source, leadSource)] : []),
          ...(teamMemberId ? [eq(leads.assignedTo, teamMemberId)] : []),
          ...dateFilter(leads.createdAt)
        )
      ),
    db
      .select({
        id: serviceRequests.id,
        customerCompany: serviceRequests.customerCompany,
        partnerType: partners.type,
        status: serviceRequests.status,
        slaStatus: serviceRequests.slaStatus,
        pricing: serviceRequests.pricing,
        createdAt: serviceRequests.createdAt,
      })
      .from(serviceRequests)
      .innerJoin(partners, eq(serviceRequests.partnerId, partners.id))
      .where(
        and(
          isNull(serviceRequests.deletedAt),
          ...(partnerId ? [eq(serviceRequests.partnerId, partnerId)] : []),
          ...(partnerType ? [eq(partners.type, partnerType)] : []),
          ...(serviceStatus ? [eq(serviceRequests.status, serviceStatus)] : []),
          ...(teamMemberId ? [eq(serviceRequests.assignedTo, teamMemberId)] : []),
          ...dateFilter(serviceRequests.createdAt)
        )
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
          isNull(invoices.deletedAt),
          ...(partnerId ? [eq(invoices.partnerId, partnerId)] : []),
          ...(partnerType ? [eq(partners.type, partnerType)] : []),
          ...dateFilter(invoices.createdAt)
        )
      ),
  ])

  const sections = [
    "LEADS",
    toCsv(leadRows as Record<string, unknown>[]),
    "",
    "SERVICE REQUESTS",
    toCsv(srRows as Record<string, unknown>[]),
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
