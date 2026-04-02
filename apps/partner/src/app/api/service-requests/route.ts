import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { db, partners, serviceRequests, services } from "@repo/db"

const createServiceRequestSchema = z.object({
  clientCompany: z.string().min(1, "Client company is required").max(255),
  clientContact: z.string().min(1, "Client contact is required").max(255),
  clientEmail: z.string().email("Valid client email required"),
  serviceType: z.string().min(1, "Select a service"),
  description: z.string().optional().default(""),
})

async function getPartner(userId: string) {
  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.clerkUserId, userId))
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

    return NextResponse.json({ serviceRequests: rows })
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

    const { clientCompany, clientContact, clientEmail, serviceType, description } =
      parsed.data

    let [service] = await db
      .select()
      .from(services)
      .where(
        and(eq(services.tenantId, partner.tenantId), eq(services.name, serviceType)),
      )
      .limit(1)

    if (!service) {
      ;[service] = await db
        .insert(services)
        .values({
          tenantId: partner.tenantId,
          name: serviceType,
          category: "partner-request",
          description: `Autocreated from partner service request intake for ${serviceType}.`,
          basePrice: "0",
          requiredDocuments: "[]",
          isActive: true,
        })
        .returning()
    }

    const [newRequest] = await db
      .insert(serviceRequests)
      .values({
        tenantId: partner.tenantId,
        partnerId: partner.id,
        serviceId: service.id,
        customerCompany: clientCompany,
        customerContact: clientContact,
        customerEmail: clientEmail,
        status: "pending",
        notes: description || null,
      })
      .returning()

    return NextResponse.json(
      {
        serviceRequest: {
          id: newRequest.id,
          customerCompany: newRequest.customerCompany,
          customerContact: newRequest.customerContact,
          customerEmail: newRequest.customerEmail,
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
