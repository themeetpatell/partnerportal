import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, leads, logActivity } from "@repo/db"
import { eq, and, or, isNull } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getActiveTeamMember, getActorName } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-leads:create:${userId}`, 30, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)

  const allowedRoles = ["admin", "partnership", "sales", "appointment_setter"]
  if (!member || !allowedRoles.includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()

  const body = await req.json()
  const {
    partnerId,
    customerName,
    customerEmail,
    customerPhone,
    customerCompany,
    serviceInterest = [],
    notes,
    source = "manual",
    channel,
    region,
    country,
    city,
    assignedTo,
    onBehalfNote,
  } = body

  if (!partnerId || !customerName || !customerEmail) {
    return NextResponse.json(
      { error: "partnerId, customerName, customerEmail are required" },
      { status: 400 }
    )
  }

  if (!onBehalfNote?.trim()) {
    return NextResponse.json(
      { error: "onBehalfNote is required when creating a lead on behalf of a partner" },
      { status: 400 }
    )
  }

  // Duplicate check by email or phone within same partner
  const existing = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        eq(leads.partnerId, partnerId),
        eq(leads.tenantId, tenantId),
        isNull(leads.deletedAt),
        or(
          eq(leads.customerEmail, customerEmail),
          customerPhone ? eq(leads.customerPhone, customerPhone) : undefined
        )
      )
    )
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A lead with this email/phone already exists for this partner", duplicateId: existing[0]!.id },
      { status: 409 }
    )
  }

  const [created] = await db
    .insert(leads)
    .values({
      tenantId,
      partnerId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      customerCompany: customerCompany || null,
      serviceInterest: JSON.stringify(serviceInterest),
      notes: notes || null,
      status: "submitted",
      source,
      channel: channel || null,
      region: region || null,
      country: country || null,
      city: city || null,
      assignedTo: assignedTo || null,
      createdBy: userId,
      onBehalfNote: onBehalfNote.trim(),
    })
    .returning()

  await logActivity({
    tenantId,
    entityType: "lead",
    entityId: created!.id,
    actorId: userId,
    actorName,
    action: "created",
    note: `Created by ${actorName} on behalf of partner. Note: ${onBehalfNote.trim()}`,
    metadata: { source, channel },
  })

  return NextResponse.json(created, { status: 201 })
}
