import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { db, leads, partners, serviceRequests, services } from "@repo/db"
import { rateLimit } from "@repo/auth"
import { createZohoDeal, normalizeZohoLeadServices } from "@repo/zoho"

const createServiceRequestSchema = z.object({
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
        id: serviceRequests.id,
        customerCompany: serviceRequests.customerCompany,
        customerContact: serviceRequests.customerContact,
        customerEmail: serviceRequests.customerEmail,
        serviceName: services.name,
        status: serviceRequests.status,
        createdAt: serviceRequests.createdAt,
      })
      .from(serviceRequests)
      .innerJoin(services, eq(serviceRequests.serviceId, services.id))
      .where(and(eq(serviceRequests.partnerId, partner.id), isNull(serviceRequests.deletedAt)))
      .orderBy(serviceRequests.createdAt)

    return NextResponse.json(
      { serviceRequests: rows },
      {
        headers: {
          "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60",
        },
      }
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

    const parsed = createServiceRequestSchema.safeParse(body)
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

    const lead = await db
      .select({
        id: leads.id,
        customerCompany: leads.customerCompany,
        customerName: leads.customerName,
        customerEmail: leads.customerEmail,
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

    if (!lead) {
      return NextResponse.json(
        { error: "Select an existing client from your won leads." },
        { status: 422 },
      )
    }

    const customerCompany =
      lead.customerCompany?.trim() || lead.customerName.trim() || lead.customerEmail.trim()
    const customerContact = lead.customerName.trim()
    const customerEmail = lead.customerEmail.trim()

    // Closing date: 30 days from today
    const closingDate = new Date()
    closingDate.setDate(closingDate.getDate() + 30)
    const closingDateStr = closingDate.toISOString().slice(0, 10)

    // Create deal in Zoho Cross-selling Pipeline
    const zohoServices = normalizeZohoLeadServices(serviceInterest)
    const zohoDealId = await createZohoDeal({
      Deal_Name: `${customerCompany} - Cross-sell`,
      Stage: "Opportunity Screening",
      Pipeline: "Cross Selling Pipeline",
      Account_Name: customerCompany,
      Description: `Contact: ${customerContact} (${customerEmail})\nServices: ${serviceInterest.join(", ")}\nSubmitted via Partner Portal by ${partner.contactName} (${partner.companyName})${description ? `\n\n${description}` : ""}`,
      Closing_Date: closingDateStr,
      Lead_Source: "Partner Portal",
      ...(zohoServices.length > 0 ? { List_of_Services: zohoServices } : {}),
    })

    const [newRequest] = await db
      .insert(serviceRequests)
      .values({
        tenantId: partner.tenantId,
        partnerId: partner.id,
        serviceId: null,
        servicesList: JSON.stringify(serviceInterest),
        leadId: lead.id,
        customerCompany,
        customerContact,
        customerEmail,
        status: "pending",
        notes: [
          description || null,
          zohoDealId ? `zoho_deal_id:${zohoDealId}` : null,
        ]
          .filter(Boolean)
          .join("\n") || null,
      })
      .returning()

    return NextResponse.json(
      {
        serviceRequest: {
          id: newRequest.id,
          customerCompany: newRequest.customerCompany,
          customerContact: newRequest.customerContact,
          customerEmail: newRequest.customerEmail,
          serviceName: serviceInterest.join(", "),
          status: newRequest.status,
          createdAt: newRequest.createdAt,
        },
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
