import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { db, crmActivities, partners, logActivity } from "@repo/db"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, PARTNER_OPERATIONS_ROLES } from "@/lib/rbac"
import { isPartnerReadable, resolvePartnerScopeForActor } from "@/lib/row-scope"

const ACTIVITY_TYPES = ["call", "meeting_in_person", "meeting_virtual", "email", "task"] as const

const createSchema = z.object({
  activityType: z.enum(ACTIVITY_TYPES),
  subject: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  scheduledAt: z.string().min(1),
  endAt: z.string().optional().nullable(),
  durationMinutes: z.number().int().min(1).max(1440).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  meetingUrl: z.union([z.string().url().max(2000), z.literal("")]).optional().nullable(),
  assignedToTeamMemberId: z.string().uuid().optional().nullable(),
})

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getActiveTeamMember(userId)
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const tenantId = getRequiredTenantId()
  const { id: partnerId } = await params

  const scope = await resolvePartnerScopeForActor({
    tenantId,
    actorUserId: userId,
    member,
  })
  if (!isPartnerReadable(scope, partnerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [p] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(and(eq(partners.id, partnerId), eq(partners.tenantId, tenantId), isNull(partners.deletedAt)))
    .limit(1)
  if (!p) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

  const rows = await db
    .select()
    .from(crmActivities)
    .where(and(eq(crmActivities.partnerId, partnerId), eq(crmActivities.tenantId, tenantId)))
    .orderBy(desc(crmActivities.scheduledAt))
    .limit(150)

  return NextResponse.json({ activities: rows })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, PARTNER_OPERATIONS_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()
  const { id: partnerId } = await params

  const scope = await resolvePartnerScopeForActor({
    tenantId,
    actorUserId: userId,
    member,
  })
  if (!isPartnerReadable(scope, partnerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [p] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(and(eq(partners.id, partnerId), eq(partners.tenantId, tenantId), isNull(partners.deletedAt)))
    .limit(1)
  if (!p) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 },
    )
  }

  const data = parsed.data
  const scheduledAt = parseDate(data.scheduledAt)
  if (!scheduledAt) {
    return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 422 })
  }
  const endAt = parseDate(data.endAt ?? undefined)

  const [created] = await db
    .insert(crmActivities)
    .values({
      tenantId,
      partnerId,
      leadId: null,
      activityType: data.activityType,
      subject: data.subject,
      description: data.description ?? null,
      scheduledAt,
      endAt,
      durationMinutes: data.durationMinutes ?? null,
      location: data.location ?? null,
      meetingUrl: data.meetingUrl === "" ? null : (data.meetingUrl ?? null),
      status: "scheduled",
      assignedToTeamMemberId: data.assignedToTeamMemberId ?? null,
      createdByUserId: userId,
    })
    .returning()

  const actorName = await getActorName()
  await logActivity({
    tenantId,
    actorId: userId,
    actorName,
    action: "crm_activity.created",
    entityType: "partner",
    entityId: partnerId,
    note: `${data.activityType.replace(/_/g, " ")}: ${data.subject}`,
    metadata: { activityId: created?.id },
  })

  return NextResponse.json({ activity: created }, { status: 201 })
}
