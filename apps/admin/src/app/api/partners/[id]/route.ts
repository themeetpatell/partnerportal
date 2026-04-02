import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db, partners, teamMembers, logActivity } from "@repo/db"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

const updatePartnerSchema = z.object({
  // Identity (admin-only)
  type: z.enum(["referral", "channel"]).optional(),
  tier: z.string().max(50).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  channel: z.string().max(50).optional().nullable(),

  // CRM management (admin-only)
  partnershipManager: z.string().max(255).optional().nullable(),
  appointmentsSetter: z.string().max(255).optional().nullable(),
  strategicFunnelStage: z.string().max(255).optional().nullable(),
  activationDate: z.string().optional().nullable(),
  lastMetOn: z.string().optional().nullable(),
  meetingScheduledDateAS: z.string().optional().nullable(),
  meetingDatePM: z.string().optional().nullable(),
  partnersId: z.string().max(100).optional().nullable(),

  // Secondary admin fields
  partnershipLevel: z.string().max(100).optional().nullable(),
  agreementStartDate: z.string().optional().nullable(),
  agreementEndDate: z.string().optional().nullable(),
  salesTrainingDone: z.boolean().optional().nullable(),
  emailOptOut: z.boolean().optional().nullable(),

  // Commission (admin-only)
  commissionType: z.string().max(50).optional().nullable(),
  commissionRate: z.string().max(20).optional().nullable(),

  // Also allow admin to update partner-editable fields
  companyName: z.string().min(1).max(255).optional(),
  contactName: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  designation: z.string().max(255).optional().nullable(),
  dateOfBirth: z.string().max(20).optional().nullable(),
  secondaryEmail: z.string().email().max(255).optional().nullable().or(z.literal("")),
  website: z.string().url().max(500).optional().nullable().or(z.literal("")),
  linkedinId: z.string().max(255).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  businessSize: z.enum(["solo", "small", "medium", "large"]).optional().nullable(),
  partnerIndustry: z.string().max(255).optional().nullable(),
  overview: z.string().max(2000).optional().nullable(),
  partnerAddress: z.string().max(500).optional().nullable(),
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

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify admin/partnership role
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.clerkUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (!member || !["admin", "partnership"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const parsed = updatePartnerSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return NextResponse.json(
      { error: firstError?.message ?? "Validation failed." },
      { status: 422 }
    )
  }

  const data = parsed.data

  // Build the set object, converting date strings to Date objects for timestamp columns
  const setObj: Record<string, unknown> = { updatedAt: new Date() }

  const stringFields = [
    "type", "tier", "region", "country", "city", "channel",
    "partnershipManager", "appointmentsSetter", "strategicFunnelStage",
    "partnersId", "partnershipLevel", "commissionType", "commissionRate",
    "companyName", "contactName", "phone", "designation", "dateOfBirth",
    "secondaryEmail", "website", "linkedinId", "nationality", "businessSize",
    "partnerIndustry", "overview", "partnerAddress", "vatNumber", "tradeLicense",
    "emirateIdPassport", "beneficiaryName", "bankName", "bankCountry",
    "accountNoIban", "swiftBicCode", "paymentFrequency",
  ] as const

  for (const field of stringFields) {
    if (data[field] !== undefined) {
      setObj[field] = data[field] === "" ? null : data[field]
    }
  }

  const boolFields = ["salesTrainingDone", "emailOptOut", "vatRegistered"] as const
  for (const field of boolFields) {
    if (data[field] !== undefined) {
      setObj[field] = data[field]
    }
  }

  const dateFields = [
    "activationDate", "lastMetOn", "meetingScheduledDateAS", "meetingDatePM",
    "agreementStartDate", "agreementEndDate",
  ] as const
  for (const field of dateFields) {
    const parsed = parseOptionalDate(data[field])
    if (parsed !== undefined) {
      setObj[field] = parsed
    }
  }

  const [updated] = await db
    .update(partners)
    .set(setObj)
    .where(eq(partners.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Partner not found." }, { status: 404 })
  }

  // Log activity
  const user = await currentUser()
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Admin"

  await logActivity({
    tenantId: updated.tenantId,
    actorId: userId,
    actorName,
    action: "partner.updated",
    entityType: "partner",
    entityId: id,
    metadata: { updatedFields: Object.keys(data) },
  })

  return NextResponse.json({ partner: updated })
}
