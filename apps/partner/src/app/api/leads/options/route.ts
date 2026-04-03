import { auth } from "@repo/auth/server"
import { NextResponse } from "next/server"
import { db, partners, services } from "@repo/db"
import { and, eq } from "drizzle-orm"
import {
  fetchZohoLeadServiceOptions,
  ZOHO_LEAD_SERVICE_PICKLIST_VALUES,
} from "@repo/zoho"

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
        {
          serviceOptions: [...ZOHO_LEAD_SERVICE_PICKLIST_VALUES],
          source: "crm-fallback",
        },
        { status: 200 },
      )
    }

    const [crmOptions, dbOptions] = await Promise.all([
      fetchZohoLeadServiceOptions(),
      db
        .select({ name: services.name })
        .from(services)
        .where(and(eq(services.tenantId, partner.tenantId), eq(services.isActive, true)))
        .then((rows) => rows.map((row) => row.name).filter(Boolean)),
    ])

    const options =
      crmOptions.length > 0
        ? crmOptions
        : dbOptions.length > 0
          ? dbOptions
          : [...ZOHO_LEAD_SERVICE_PICKLIST_VALUES]

    return NextResponse.json({
      serviceOptions: [...new Set(options)].sort((a, b) => a.localeCompare(b)),
      source:
        crmOptions.length > 0
          ? "crm"
          : dbOptions.length > 0
            ? "db-fallback"
            : "crm-fallback",
    })
  } catch (error) {
    console.error("[GET /api/leads/options] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    )
  }
}
