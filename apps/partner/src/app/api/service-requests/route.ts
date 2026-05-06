import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { db, leads, partners } from "@repo/db"
import { rateLimit } from "@repo/auth"
import { splitCustomerNameForStorage } from "@repo/types"

const createExistingLeadSchema = z.object({
  leadId: z.string().uuid("Select an existing client"),
  serviceInterest: z
    .array(z.string().min(1))
    .min(1, "Select at least one service."),
  description: z.string().optional().default(""),
})

async function getPartner(userId: string) {
  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.authUserId, userId))
    .limit(1)

  return partner
}

function firstServiceLabel(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
      return parsed.join(", ")
    }
  } catch {
    // ignore
  }
  return "Services"
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    const partner = await getPartner(userId)
    if (!partner) {
      return NextResponse.json({ serviceRequests: [] }, { status: 200 })
    }

    const rows = await db
      .select({
        id: leads.id,
        customerCompany: leads.customerCompany,
        customerName: leads.customerName,
        customerEmail: leads.customerEmail,
        serviceInterest: leads.serviceInterest,
        status: leads.status,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        and(
          eq(leads.partnerId, partner.id),
          eq(leads.intakeType, "existing_lead"),
          isNull(leads.deletedAt),
        ),
      )
      .orderBy(leads.createdAt)

    return NextResponse.json(
      {
        serviceRequests: rows.map((r) => ({
          id: r.id,
          customerCompany: r.customerCompany ?? r.customerName,
          customerContact: r.customerName,
          customerEmail: r.customerEmail,
          serviceName: firstServiceLabel(r.serviceInterest),
          status: r.status,
          createdAt: r.createdAt,
        })),
      },
      {
        headers: {
          "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60",
        },
      },
    )
  } catch (error) {
    console.error("[GET /api/service-requests] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      )
    }

    const limited = rateLimit(`service-requests:${userId}`, 20, 60_000)
    if (limited) return limited

    const partner = await getPartner(userId)
    if (!partner) {
      return NextResponse.json(
        { error: "Partner account not found. Please complete registration first." },
        { status: 404 },
      )
    }

    if (partner.status !== "approved") {
      return NextResponse.json(
        { error: "Your partner account is pending approval." },
        { status: 403 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
    }

    const parsed = createExistingLeadSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return NextResponse.json(
        {
          error: firstError?.message ?? "Validation failed.",
          issues: parsed.error.issues,
        },
        { status: 422 },
      )
    }

    const { leadId, serviceInterest, description } = parsed.data

    const src = await db
      .select({
        id: leads.id,
        customerCompany: leads.customerCompany,
        customerName: leads.customerName,
        customerEmail: leads.customerEmail,
        customerPhone: leads.customerPhone,
        firstName: leads.firstName,
        lastName: leads.lastName,
      })
      .from(leads)
      .where(
        and(
          eq(leads.id, leadId),
          eq(leads.partnerId, partner.id),
          eq(leads.status, "deal_won"),
          isNull(leads.deletedAt),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (!src) {
      return NextResponse.json(
        { error: "Select an existing client from your won leads." },
        { status: 422 },
      )
    }

    const customerCompany =
      src.customerCompany?.trim() || src.customerName.trim() || src.customerEmail.trim()
    const customerName = src.customerName.trim()
    const customerEmail = src.customerEmail.trim()
    const { firstName: fnStore, lastName: lnStore } = splitCustomerNameForStorage(customerName)

    const [newLead] = await db
      .insert(leads)
      .values({
        tenantId: partner.tenantId,
        partnerId: partner.id,
        customerName,
        firstName: src.firstName ?? fnStore,
        lastName: src.lastName ?? lnStore,
        customerEmail,
        customerPhone: src.customerPhone ?? null,
        customerCompany: customerCompany || null,
        serviceInterest: JSON.stringify(serviceInterest),
        notes: description?.trim() || null,
        status: "submitted",
        source: "partner_portal",
        channel: "partner_portal",
        intakeType: "existing_lead",
        sourceLeadId: src.id,
      })
      .returning()

    return NextResponse.json(
      {
        serviceRequest: {
          id: newLead!.id,
          customerCompany,
          customerContact: customerName,
          customerEmail,
          serviceName: serviceInterest.join(", "),
          status: newLead!.status,
          createdAt: newLead!.createdAt,
        },
        leadId: newLead!.id,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[POST /api/service-requests] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    )
  }
}
