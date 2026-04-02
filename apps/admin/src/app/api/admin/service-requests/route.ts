import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, serviceRequests, logActivity } from "@repo/db"
import { rateLimit } from "@repo/auth"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-service-requests:create:${userId}`, 30, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)
  const tenantId = getRequiredTenantId()

  const allowedRoles = ["admin", "partnership", "sales"]
  if (!member || !allowedRoles.includes(member.role)) {
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
      tenantId,
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
    tenantId,
    entityType: "service_request",
    entityId: created!.id,
    actorId: userId,
    actorName,
    action: "created",
    note: `Service request created by ${actorName} on behalf of partner. Note: ${onBehalfNote.trim()}`,
  })

  return NextResponse.json(created, { status: 201 })
}
