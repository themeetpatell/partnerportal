import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@repo/db"
import { leads, partners } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { rateLimit } from "@repo/auth"

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

    // Look up partner record for this Clerk user
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.clerkUserId, userId))
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

    // Insert lead
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
      })
      .returning()

    return NextResponse.json(
      {
        lead: {
          id: newLead.id,
          customerName: newLead.customerName,
          customerEmail: newLead.customerEmail,
          serviceInterest: JSON.parse(newLead.serviceInterest),
          status: newLead.status,
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
      .where(eq(partners.clerkUserId, userId))
      .limit(1)

    if (!partner) {
      return NextResponse.json({ leads: [] }, { status: 200 })
    }

    const partnerLeads = await db
      .select()
      .from(leads)
      .where(and(eq(leads.partnerId, partner.id), isNull(leads.deletedAt)))
      .orderBy(leads.createdAt)

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error("[GET /api/leads] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    )
  }
}
