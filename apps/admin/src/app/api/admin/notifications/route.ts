import { auth } from "@repo/auth/server"
import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db, activityTimelines } from "@repo/db"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"

function humanizeAction(action: string) {
  return action.replace(/_/g, " ")
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const member = await getCurrentActiveTeamMember()
  if (!member) return NextResponse.json({ notifications: [] })

  const tenantId = getRequiredTenantId()

  const rows = await db
    .select({
      id: activityTimelines.id,
      action: activityTimelines.action,
      actorName: activityTimelines.actorName,
      note: activityTimelines.note,
      createdAt: activityTimelines.createdAt,
    })
    .from(activityTimelines)
    .where(eq(activityTimelines.tenantId, tenantId))
    .orderBy(desc(activityTimelines.createdAt))
    .limit(40)

  const notifications = rows.map((row) => ({
    id: row.id,
    type: row.action,
    title: `${row.actorName} · ${humanizeAction(row.action)}`,
    body: row.note?.trim() ? row.note : "Workspace activity update.",
    isRead: "true" as const,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }))

  return NextResponse.json({ notifications })
}

export async function PATCH() {
  return NextResponse.json({ success: true })
}
