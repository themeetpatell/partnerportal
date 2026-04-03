import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@repo/db"
import { leads, partners } from "@repo/db"
import { and, eq, isNull, or } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { createZohoLead, normalizeZohoLeadServices } from "@repo/zoho"
import { sendLeadSubmittedEmail } from "@repo/notifications"

function splitCustomerName(fullName: string) {
  const trimmed = fullName.trim()
  if (!trimmed) {
    return { firstName: undefined, lastName: "Unknown" }
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return { firstName: undefined, lastName: parts[0]! }
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1)!,
  }
}

function buildZohoLeadDescription(params: {
  partnerName: string
  partnerCompany: string
  serviceInterest: string[]
  notes: string
}) {
  const lines = [
    `Submitted via partner portal by ${params.partnerName} (${params.partnerCompany}).`,
  ]

  if (params.serviceInterest.length > 0) {
    lines.push(`Services interested: ${params.serviceInterest.join(", ")}`)
  }

  if (params.notes.trim()) {
    lines.push(`Notes: ${params.notes.trim()}`)
  }

  return lines.join("\n")
}

const createLeadSchema = z
  .object({
    customerName: z.string().min(1, "Customer name is required").max(255),
    customerEmail: z.string().email("Invalid email address"),
    customerPhone: z.string().optional().default(""),
    customerCompany: z.string().optional().default(""),
    serviceInterest: z
      .array(z.string())
      .min(1, "Select at least one service of interest.")
      .optional(),
    serviceInterests: z
      .array(z.string())
      .min(1, "Select at least one service of interest.")
      .optional(),
    notes: z.string().optional().default(""),
  })
  .transform((data) => ({
    ...data,
    serviceInterest: data.serviceInterest ?? data.serviceInterests ?? [],
  }))

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      )
    }

    // Rate limit: 30 leads per user per minute
    const limited = rateLimit(`leads:${userId}`, 30, 60_000)
    if (limited) return limited

    // Look up the partner record for the authenticated user
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.authUserId, userId))
      .limit(1)

    if (!partner) {
      return NextResponse.json(
        {
          error:
            "Partner account not found. Please complete registration first.",
        },
        { status: 404 }
      )
    }

    if (partner.status !== "approved") {
      return NextResponse.json(
        {
          error:
            "Your partner account is pending approval. You cannot submit leads yet.",
        },
        { status: 403 }
      )
    }

    // Parse and validate body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      )
    }

    const parsed = createLeadSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return NextResponse.json(
        {
          error: firstError?.message ?? "Validation failed.",
          issues: parsed.error.issues,
        },
        { status: 422 }
      )
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      serviceInterest,
      notes,
    } = parsed.data

    const existing = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.partnerId, partner.id),
          eq(leads.tenantId, partner.tenantId),
          isNull(leads.deletedAt),
          or(
            eq(leads.customerEmail, customerEmail),
            customerPhone ? eq(leads.customerPhone, customerPhone) : undefined,
          ),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: "A lead with this email or phone already exists for your account.",
          duplicateId: existing[0]!.id,
        },
        { status: 409 },
      )
    }

    const { firstName, lastName } = splitCustomerName(customerName)
    const zohoServices = normalizeZohoLeadServices(serviceInterest)
    const zohoLeadId = await createZohoLead({
      First_Name: firstName,
      Last_Name: lastName,
      Email: customerEmail,
      Phone: customerPhone || undefined,
      Company: customerCompany || customerName,
      Lead_Source: "Partner Portal",
      Lead_Status: "New (Incoming)",
      Services_List: zohoServices.length > 0 ? zohoServices : undefined,
      Description: buildZohoLeadDescription({
        partnerName: partner.contactName,
        partnerCompany: partner.companyName,
        serviceInterest,
        notes,
      }),
    })

    if (!zohoLeadId) {
      return NextResponse.json(
        {
          error:
            "Lead could not be created in Zoho CRM. Please try again or contact support.",
        },
        { status: 502 },
      )
    }

    const [newLead] = await db
      .insert(leads)
      .values({
        tenantId: partner.tenantId,
        partnerId: partner.id,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        customerCompany: customerCompany || null,
        serviceInterest: JSON.stringify(serviceInterest),
        notes: notes || null,
        status: "submitted",
        source: "partner_portal",
        channel: "partner_portal",
        zohoLeadId,
      })
      .returning()

    // Fire-and-forget confirmation email — never block the response
    sendLeadSubmittedEmail(
      partner.email,
      partner.contactName,
      customerName,
      serviceInterest
    ).catch((err) => console.error("[POST /api/leads] Confirmation email failed:", err))

    return NextResponse.json(
      {
        lead: {
          id: newLead.id,
          customerName: newLead.customerName,
          customerEmail: newLead.customerEmail,
          serviceInterest: JSON.parse(newLead.serviceInterest),
          status: newLead.status,
          zohoLeadId: newLead.zohoLeadId,
          createdAt: newLead.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/leads] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      )
    }

    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.authUserId, userId))
      .limit(1)

    if (!partner) {
      return NextResponse.json({ leads: [] }, { status: 200 })
    }

    const partnerLeads = await db
      .select()
      .from(leads)
      .where(and(eq(leads.partnerId, partner.id), isNull(leads.deletedAt)))
      .orderBy(leads.createdAt)

    return NextResponse.json(
      {
        leads: partnerLeads.map((lead) => ({
          ...lead,
          serviceInterest: (() => {
            try {
              return JSON.parse(lead.serviceInterest)
            } catch {
              return []
            }
          })(),
        })),
      },
      {
        headers: {
          "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60",
        },
      }
    )
  } catch (error) {
    console.error("[GET /api/leads] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    )
  }
}
