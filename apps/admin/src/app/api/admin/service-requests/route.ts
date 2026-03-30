import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db, serviceRequests, teamMembers, logActivity } from "@repo/db"
import { and, eq } from "drizzle-orm"

const TENANT_ID = process.env.DEFAULT_TENANT_ID!

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await currentUser()
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.emailAddresses[0]?.emailAddress ||
    "Admin"

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.clerkUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  const allowedRoles = ["admin", "partnership", "sales"]
  if (member && !allowedRoles.includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const {
    partnerId,
    serviceId,
    leadId,
    customerCompany,
    customerContact,
    customerEmail,
    pricing,
    startDate,
    endDate,
    assignedTo,
    notes,
    onBehalfNote,
  } = body

  if (!partnerId || !serviceId || !customerCompany || !customerContact || !customerEmail) {
    return NextResponse.json(
      { error: "partnerId, serviceId, customerCompany, customerContact, customerEmail are required" },
      { status: 400 }
    )
  }

  if (!onBehalfNote?.trim()) {
    return NextResponse.json(
      { error: "onBehalfNote is required when creating a service request on behalf of a partner" },
      { status: 400 }
    )
  }

  const [created] = await db
    .insert(serviceRequests)
    .values({
      tenantId: TENANT_ID,
      partnerId,
      serviceId,
      leadId: leadId || null,
      customerCompany,
      customerContact,
      customerEmail,
      pricing: pricing ? String(pricing) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      assignedTo: assignedTo || null,
      notes: notes || null,
      createdBy: userId,
      onBehalfNote: onBehalfNote.trim(),
      status: "pending",
      slaStatus: "on_track",
    })
    .returning()

  await logActivity({
    tenantId: TENANT_ID,
    entityType: "service_request",
    entityId: created!.id,
    actorId: userId,
    actorName,
    action: "created",
    note: `Service request created by ${actorName} on behalf of partner. Note: ${onBehalfNote.trim()}`,
  })

  return NextResponse.json(created, { status: 201 })
}
