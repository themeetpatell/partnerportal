import { db } from "./client"
import { activityTimelines } from "./schema"

export async function logActivity(params: {
  tenantId: string
  entityType: string
  entityId: string
  actorId: string
  actorName: string
  action: string
  note?: string
  metadata?: Record<string, unknown>
}) {
  await db.insert(activityTimelines).values({
    tenantId: params.tenantId,
    entityType: params.entityType,
    entityId: params.entityId,
    actorId: params.actorId,
    actorName: params.actorName,
    action: params.action,
    note: params.note,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
  })
}
