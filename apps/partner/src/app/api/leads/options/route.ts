import { auth } from "@repo/auth/server"
import { fallbackLeadCatalogRows } from "@repo/types"
import { NextResponse } from "next/server"
import { db, getLeadCatalogRows, partners } from "@repo/db"
import { eq } from "drizzle-orm"

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
      const fallback = fallbackLeadCatalogRows()
      return NextResponse.json(
        {
          serviceCatalog: fallback,
          serviceOptions: fallback.map((row) => row.name),
          source: "fallback",
        },
        { status: 200 },
      )
    }

    const fromDb = await getLeadCatalogRows(partner.tenantId)
    const serviceCatalog =
      fromDb.length > 0 ? fromDb : fallbackLeadCatalogRows()

    return NextResponse.json({
      serviceCatalog,
      serviceOptions: serviceCatalog.map((row) => row.name),
      source: fromDb.length > 0 ? "database" : "fallback",
    })
  } catch (error) {
    console.error("[GET /api/leads/options] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    )
  }
}
