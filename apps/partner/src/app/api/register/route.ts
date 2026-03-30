import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@repo/db"
import { partners } from "@repo/db"
import { eq } from "drizzle-orm"
import { sendPartnerApplicationReceivedEmail, sendWelcomeEmail } from "@repo/notifications"

const PLACEHOLDER_TENANT_ID = "00000000-0000-0000-0000-000000000001"

const registerSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(255),
  contactName: z.string().min(1, "Contact name is required").max(255),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().default(""),
  type: z.enum(["referral", "channel"]),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions." }),
  }),
})

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to register as a partner." },
        { status: 401 }
      )
    }

    // Check if already registered
    const existingPartner = await db
      .select()
      .from(partners)
      .where(eq(partners.clerkUserId, userId))
      .limit(1)

    if (existingPartner.length > 0) {
      return NextResponse.json(
        { error: "You already have a partner account." },
        { status: 409 }
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

    const parsed = registerSchema.safeParse(body)
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

    const { companyName, contactName, email, phone, type } = parsed.data

    // Determine status based on type
    const status = type === "referral" ? "approved" : "pending"

    // Insert partner record
    const [newPartner] = await db
      .insert(partners)
      .values({
        tenantId: PLACEHOLDER_TENANT_ID,
        clerkUserId: userId,
        type,
        companyName,
        contactName,
        email,
        phone: phone || null,
        status,
        onboardedAt: type === "referral" ? new Date() : null,
      })
      .returning()

    if (status === "approved") {
      await sendWelcomeEmail(newPartner.email, newPartner.contactName)
    } else {
      await sendPartnerApplicationReceivedEmail(
        newPartner.email,
        newPartner.contactName,
        newPartner.companyName,
        newPartner.type as "referral" | "channel"
      )
    }

    return NextResponse.json(
      {
        partner: {
          id: newPartner.id,
          type: newPartner.type,
          companyName: newPartner.companyName,
          contactName: newPartner.contactName,
          email: newPartner.email,
          status: newPartner.status,
          createdAt: newPartner.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/register] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
