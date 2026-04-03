import { auth, currentUser } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getPartnerRecordForAuthenticatedUser } from "@/lib/partner-record"

const updateProfileSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url("Invalid URL").max(500).optional().nullable().or(z.literal("")),
  linkedinId: z.string().max(255).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  businessSize: z.enum(["solo", "small", "medium", "large"]).optional().nullable(),
  partnerIndustry: z.string().max(255).optional().nullable(),
  overview: z.string().max(2000).optional().nullable(),
  partnerAddress: z.string().max(500).optional().nullable(),
  designation: z.string().max(255).optional().nullable(),
  dateOfBirth: z.string().max(20).optional().nullable(),
  secondaryEmail: z.string().email("Invalid email").max(255).optional().nullable().or(z.literal("")),
  vatRegistered: z.boolean().optional().nullable(),
  vatNumber: z.string().max(100).optional().nullable(),
  tradeLicense: z.string().max(255).optional().nullable(),
  emirateIdPassport: z.string().max(255).optional().nullable(),
  beneficiaryName: z.string().max(255).optional().nullable(),
  bankName: z.string().max(255).optional().nullable(),
  bankCountry: z.string().max(100).optional().nullable(),
  accountNoIban: z.string().max(255).optional().nullable(),
  swiftBicCode: z.string().max(50).optional().nullable(),
  paymentFrequency: z.enum(["monthly", "quarterly", "on-request"]).optional().nullable(),
})

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    const limited = rateLimit(`profile:update:${userId}`, 20, 60_000)
    if (limited) return limited

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
    }

    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message ?? "Validation failed." },
        { status: 422 }
      )
    }

    const data = parsed.data
    const user = await currentUser()
    const existingPartner = await getPartnerRecordForAuthenticatedUser({
      userId,
      email: user?.email,
    })

    if (!existingPartner) {
      return NextResponse.json({ error: "Partner record not found." }, { status: 404 })
    }

    const [updated] = await db
      .update(partners)
      .set({
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.website !== undefined && { website: data.website || null }),
        ...(data.linkedinId !== undefined && { linkedinId: data.linkedinId }),
        ...(data.nationality !== undefined && { nationality: data.nationality }),
        ...(data.businessSize !== undefined && { businessSize: data.businessSize }),
        ...(data.partnerIndustry !== undefined && { partnerIndustry: data.partnerIndustry }),
        ...(data.overview !== undefined && { overview: data.overview }),
        ...(data.partnerAddress !== undefined && { partnerAddress: data.partnerAddress }),
        ...(data.designation !== undefined && { designation: data.designation }),
        ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth }),
        ...(data.secondaryEmail !== undefined && { secondaryEmail: data.secondaryEmail || null }),
        ...(data.vatRegistered !== undefined && { vatRegistered: data.vatRegistered }),
        ...(data.vatNumber !== undefined && { vatNumber: data.vatNumber }),
        ...(data.tradeLicense !== undefined && { tradeLicense: data.tradeLicense }),
        ...(data.emirateIdPassport !== undefined && { emirateIdPassport: data.emirateIdPassport }),
        ...(data.beneficiaryName !== undefined && { beneficiaryName: data.beneficiaryName }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.bankCountry !== undefined && { bankCountry: data.bankCountry }),
        ...(data.accountNoIban !== undefined && { accountNoIban: data.accountNoIban }),
        ...(data.swiftBicCode !== undefined && { swiftBicCode: data.swiftBicCode }),
        ...(data.paymentFrequency !== undefined && { paymentFrequency: data.paymentFrequency }),
        updatedAt: new Date(),
      })
      .where(eq(partners.id, existingPartner.id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Partner record not found." }, { status: 404 })
    }

    return NextResponse.json({ partner: updated })
  } catch (error) {
    console.error("[PATCH /api/profile] Error:", error)
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 })
  }
}
