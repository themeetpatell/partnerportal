import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, leads, partners, serviceRequests, invoices } from "@repo/db"
import { eq, and, isNull, gte, lte } from "drizzle-orm"

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

  const url = new URL(req.url)
  const sp = url.searchParams
  const dateRange = getDateRange(sp.get("dateRange") ?? undefined)
  const partnerId = sp.get("partnerId")

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
        status: leads.status,
        source: leads.source,
        channel: leads.channel,
        region: leads.region,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        and(
          isNull(leads.deletedAt),
          ...(partnerId ? [eq(leads.partnerId, partnerId)] : []),
          ...dateFilter(leads.createdAt)
        )
      ),
    db
      .select({
        id: serviceRequests.id,
        customerCompany: serviceRequests.customerCompany,
        status: serviceRequests.status,
        slaStatus: serviceRequests.slaStatus,
        pricing: serviceRequests.pricing,
        createdAt: serviceRequests.createdAt,
      })
      .from(serviceRequests)
      .where(
        and(
          isNull(serviceRequests.deletedAt),
          ...(partnerId ? [eq(serviceRequests.partnerId, partnerId)] : []),
          ...dateFilter(serviceRequests.createdAt)
        )
      ),
    db
      .select({
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
        currency: invoices.currency,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
      })
      .from(invoices)
      .where(
        and(
          isNull(invoices.deletedAt),
          ...(partnerId ? [eq(invoices.partnerId, partnerId)] : []),
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
