import { auth } from "@repo/auth/server"
import { NextResponse } from "next/server"
import { and, desc, eq, isNull } from "drizzle-orm"
import { db, leads, partners, services } from "@repo/db"

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null
}

function buildClientKey(lead: {
  customerEmail: string
  customerCompany: string | null
  customerName: string
}) {
  return (
    normalize(lead.customerEmail) ||
    normalize(lead.customerCompany) ||
    normalize(lead.customerName) ||
    "unknown-client"
  )
}

async function getPartner(userId: string) {
  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.authUserId, userId))
    .limit(1)

  return partner ?? null
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    const partner = await getPartner(userId)
    if (!partner) {
      return NextResponse.json(
        { clients: [], services: [] },
        { status: 200 },
      )
    }

    if (partner.status !== "approved") {
      return NextResponse.json(
        { error: "Your partner account is pending approval." },
        { status: 403 },
      )
    }

    const [leadRows, serviceRows] = await Promise.all([
      db
        .select({
          id: leads.id,
          customerName: leads.customerName,
          customerEmail: leads.customerEmail,
          customerCompany: leads.customerCompany,
          createdAt: leads.createdAt,
        })
        .from(leads)
        .where(
          and(
            eq(leads.partnerId, partner.id),
            eq(leads.status, "deal_won"),
            isNull(leads.deletedAt),
          ),
        )
        .orderBy(desc(leads.createdAt)),
      db
        .select({
          id: services.id,
          name: services.name,
          category: services.category,
        })
        .from(services)
        .where(
          and(
            eq(services.tenantId, partner.tenantId),
            eq(services.isActive, true),
          ),
        )
        .orderBy(services.name),
    ])

    const clientMap = new Map<string, {
      leadId: string
      companyName: string
      contactName: string
      email: string
      wonAt: Date | null
    }>()

    for (const lead of leadRows) {
      const key = buildClientKey(lead)

      if (clientMap.has(key)) {
        continue
      }

      clientMap.set(key, {
        leadId: lead.id,
        companyName:
          lead.customerCompany?.trim() ||
          lead.customerName.trim() ||
          lead.customerEmail.trim(),
        contactName: lead.customerName.trim(),
        email: lead.customerEmail.trim(),
        wonAt: lead.createdAt,
      })
    }

    return NextResponse.json({
      clients: [...clientMap.values()],
      services: serviceRows,
    })
  } catch (error) {
    console.error("[GET /api/service-requests/options] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    )
  }
}
