import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db, partners, teamMembers, commissionModels, logActivity } from "@repo/db"
import { eq, and } from "drizzle-orm"

const TENANT_ID = process.env.DEFAULT_TENANT_ID!

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await currentUser()
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.emailAddresses[0]?.emailAddress ||
    "Admin"

  // Only admin or partnership roles may create partners
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.clerkUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (member && !["admin", "partnership"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const {
    companyName,
    contactName,
    email,
    phone,
    type,
    tier,
    region,
    country,
    city,
    channel,
    ownerId,
    agreementUrl,
    commissionModelId,
    status = "draft",
  } = body

  if (!companyName || !contactName || !email || !type) {
    return NextResponse.json(
      { error: "companyName, contactName, email, type are required" },
      { status: 400 }
    )
  }

  // Generate a placeholder clerkUserId for manually-created partners (no Clerk account yet)
  const placeholderClerkId = `manual_${crypto.randomUUID()}`

  const [created] = await db
    .insert(partners)
    .values({
      tenantId: TENANT_ID,
      clerkUserId: placeholderClerkId,
      companyName,
      contactName,
      email,
      phone: phone || null,
      type,
      tier: tier || null,
      region: region || null,
      country: country || null,
      city: city || null,
      channel: channel || null,
      ownerId: ownerId || null,
      agreementUrl: agreementUrl || null,
      commissionModelId: commissionModelId || null,
      status,
    })
    .returning()

  await logActivity({
    tenantId: TENANT_ID,
    entityType: "partner",
    entityId: created!.id,
    actorId: userId,
    actorName,
    action: "created",
    note: `Partner profile created manually by ${actorName}. Status: ${status}`,
  })

  return NextResponse.json(created, { status: 201 })
}
