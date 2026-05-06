import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { rateLimit } from "@repo/auth"
import { db, leadNotes, leads } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { getActiveTeamMember, getActorName } from "@/lib/admin-auth"
import { hasAnyTeamRole, LEAD_NOTES_ROLES } from "@/lib/rbac"

function toRequiredString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`lead-note:${userId}`, 60, 60_000)
  if (limited) return limited

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, LEAD_NOTES_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actorName = await getActorName()
  const { id } = await params
  const body = Object.fromEntries((await req.formData()).entries())
  const note = toRequiredString(body.note)

  if (!note) {
    return NextResponse.json({ error: "Note is required" }, { status: 422 })
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
    .limit(1)

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  await db.insert(leadNotes).values({
    tenantId: lead.tenantId,
    leadId: lead.id,
    authorId: userId,
    authorName: actorName,
    note,
    updatedAt: new Date(),
  })

  const redirectTo = new URL(req.url).searchParams.get("redirectTo") || `/leads/${id}`
  const redirectUrl = new URL(redirectTo, req.url)
  redirectUrl.searchParams.set("note", "ok")

  if ((req.headers.get("accept") || "").includes("text/html")) {
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.json({ success: true })
}
