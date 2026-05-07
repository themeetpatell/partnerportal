import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@repo/db"
import { leads, partners, teamMembers } from "@repo/db"
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { sendLeadSubmittedEmail } from "@repo/notifications"
import { splitCustomerNameForStorage } from "@repo/types"

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

async function resolveRoundRobinPreSalesOwner(tenantId: string) {
  const pool = await db
    .select({
      authUserId: teamMembers.authUserId,
      name: teamMembers.name,
      createdAt: teamMembers.createdAt,
    })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.tenantId, tenantId),
        eq(teamMembers.isActive, true),
        eq(teamMembers.role, "pre_sales_representative"),
      ),
    )

  if (pool.length === 0) {
    return null
  }

  const authIds = [...new Set(pool.map((member) => member.authUserId).filter(Boolean))]
  if (authIds.length === 0) {
    return null
  }

  const activeStatuses = [
    "submitted",
    "lead_approved",
    "lead_follow_up",
    "lead_qualified",
    "proposal_sent",
  ]

  const loadRows = await db
    .select({
      leadOwnerUserId: leads.leadOwnerUserId,
      count: sql<number>`count(*)::int`,
    })
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, tenantId),
        isNull(leads.deletedAt),
        inArray(leads.leadOwnerUserId, authIds),
        inArray(leads.status, activeStatuses),
      ),
    )
    .groupBy(leads.leadOwnerUserId)

  const loadByAuthId = new Map<string, number>(
    loadRows
      .filter((row): row is { leadOwnerUserId: string; count: number } => Boolean(row.leadOwnerUserId))
      .map((row) => [row.leadOwnerUserId, Number(row.count) || 0]),
  )

  const sorted = [...pool].sort((a, b) => {
    const loadA = loadByAuthId.get(a.authUserId) ?? 0
    const loadB = loadByAuthId.get(b.authUserId) ?? 0
    if (loadA !== loadB) return loadA - loadB
    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  const winner = sorted[0]
  if (!winner) return null

  return {
    leadOwnerUserId: winner.authUserId,
    leadOwnerDisplay: winner.name,
  }
}

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

    const { firstName: fnStore, lastName: lnStore } =
      splitCustomerNameForStorage(customerName)

    const preSalesOwner = await resolveRoundRobinPreSalesOwner(partner.tenantId)

    const [newLead] = await db
      .insert(leads)
      .values({
        tenantId: partner.tenantId,
        partnerId: partner.id,
        customerName,
        firstName: fnStore,
        lastName: lnStore,
        customerEmail,
        customerPhone: customerPhone || null,
        customerCompany: customerCompany || null,
        serviceInterest: JSON.stringify(serviceInterest),
        notes: notes || null,
        status: "submitted",
        source: "partner_portal",
        channel: "partner_portal",
        assignedTo: preSalesOwner?.leadOwnerUserId ?? null,
        leadOwnerUserId: preSalesOwner?.leadOwnerUserId ?? null,
        leadOwner: preSalesOwner?.leadOwnerDisplay ?? null,
        dealOwnerUserId: null,
        dealOwner: null,
        appointmentSetter: preSalesOwner?.leadOwnerDisplay ?? null,
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
          id: newLead!.id,
          customerName: newLead!.customerName,
          customerEmail: newLead!.customerEmail,
          serviceInterest: JSON.parse(newLead!.serviceInterest),
          status: newLead!.status,
          createdAt: newLead!.createdAt,
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
