import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@repo/auth/server"
import { rateLimit } from "@repo/auth"
import { db, serviceRequests } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import {
  SERVICE_REQUEST_STATUS_TRANSITIONS,
  ServiceRequestStatusSchema,
  type ServiceRequestStatus,
} from "@repo/types"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasModuleAccess } from "@/lib/rbac"
import { isPartnerReadable, resolvePartnerScopeForActor } from "@/lib/row-scope"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`service-request-status:${userId}`, 30, 60_000)
  if (limited) return limited

  const member = await getActiveTeamMember(userId)
  if (!member || !hasModuleAccess(member.role, member.permissions, "services", "rw")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const tenantId = getRequiredTenantId()
  const actor = await currentUser()
  const scope = await resolvePartnerScopeForActor({
    tenantId,
    actorUserId: actor?.id ?? userId,
    member,
  })

  const [row] = await db
    .select()
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.id, id),
        eq(serviceRequests.tenantId, tenantId),
        isNull(serviceRequests.deletedAt),
      ),
    )
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!isPartnerReadable(scope, row.partnerId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const contentType = req.headers.get("content-type") || ""
  const body =
    contentType.includes("application/json")
      ? await req.json().catch(() => ({}))
      : Object.fromEntries((await req.formData()).entries())

  const parsed = ServiceRequestStatusSchema.safeParse(body?.status)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 422 })
  }

  const nextStatus = parsed.data
  const currentStatus = row.status as ServiceRequestStatus

  if (currentStatus === nextStatus) {
    return NextResponse.json({ success: true, request: row })
  }

  const allowed = SERVICE_REQUEST_STATUS_TRANSITIONS[currentStatus] ?? []
  if (!allowed.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Invalid transition from ${currentStatus} to ${nextStatus}` },
      { status: 409 },
    )
  }

  const now = new Date()
  const patch: {
    status: ServiceRequestStatus
    updatedAt: Date
    startDate?: Date | null
    completedAt?: Date | null
    cancelledAt?: Date | null
  } = {
    status: nextStatus,
    updatedAt: now,
  }

  if (nextStatus === "in_progress") {
    patch.startDate = row.startDate ?? now
  }
  if (nextStatus === "completed") {
    patch.completedAt = now
  }
  if (nextStatus === "cancelled") {
    patch.cancelledAt = now
  }

  const [updated] = await db
    .update(serviceRequests)
    .set(patch)
    .where(eq(serviceRequests.id, id))
    .returning()

  return NextResponse.json({ success: true, request: updated ?? null })
}
