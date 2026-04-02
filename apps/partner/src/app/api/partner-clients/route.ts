import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, or } from "drizzle-orm"
import { z } from "zod"
import { db, partnerClients, partners } from "@repo/db"
import { rateLimit } from "@repo/auth"

const createPartnerClientSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(255),
  contactName: z.string().min(1, "Contact name is required").max(255),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  country: z.string().optional().default(""),
  city: z.string().optional().default(""),
  status: z.enum(["active", "watchlist", "inactive"]).optional().default("active"),
  renewalDate: z.string().optional().default(""),
  notes: z.string().optional().default(""),
})

async function getApprovedPartner(userId: string) {
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

    const partner = await getApprovedPartner(userId)
    if (!partner) {
      return NextResponse.json({ partnerClients: [] }, { status: 200 })
    }

    const rows = await db
      .select()
      .from(partnerClients)
      .where(
        and(
          eq(partnerClients.partnerId, partner.id),
          isNull(partnerClients.deletedAt)
        )
      )
      .orderBy(partnerClients.createdAt)

    return NextResponse.json({ partnerClients: rows })
  } catch (error) {
    console.error("[GET /api/partner-clients] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      )
    }

    const limited = rateLimit(`partner-clients:${userId}`, 30, 60_000)
    if (limited) return limited

    const partner = await getApprovedPartner(userId)
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
            "Your partner account is pending approval. You cannot create clients yet.",
        },
        { status: 403 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      )
    }

    const parsed = createPartnerClientSchema.safeParse(body)
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
      companyName,
      contactName,
      email,
      phone,
      country,
      city,
      status,
      renewalDate,
      notes,
    } = parsed.data

    const normalizedEmail = email?.trim() || null
    const normalizedCompanyName = companyName.trim()

    const existing = await db
      .select({ id: partnerClients.id })
      .from(partnerClients)
      .where(
        and(
          eq(partnerClients.partnerId, partner.id),
          eq(partnerClients.tenantId, partner.tenantId),
          isNull(partnerClients.deletedAt),
          or(
            normalizedEmail
              ? eq(partnerClients.email, normalizedEmail)
              : undefined,
            eq(partnerClients.companyName, normalizedCompanyName)
          )
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error:
            "A client with this company or email already exists for your account.",
          duplicateId: existing[0]!.id,
        },
        { status: 409 }
      )
    }

    const [created] = await db
      .insert(partnerClients)
      .values({
        tenantId: partner.tenantId,
        partnerId: partner.id,
        companyName: normalizedCompanyName,
        contactName: contactName.trim(),
        email: normalizedEmail,
        phone: phone.trim() || null,
        country: country.trim() || null,
        city: city.trim() || null,
        status,
        renewalDate: renewalDate ? new Date(renewalDate) : null,
        notes: notes.trim() || null,
      })
      .returning()

    return NextResponse.json({ partnerClient: created }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/partner-clients] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
