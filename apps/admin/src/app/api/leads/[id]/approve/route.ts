import { NextRequest, NextResponse } from "next/server"
import { redirect } from "next/navigation"
import { auth } from "@repo/auth/server"
import { db, leads } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { hasAnyTeamRole, LEAD_PIPELINE_ROLES } from "@/lib/rbac"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const redirectTo = req.nextUrl.searchParams.get("redirectTo")

  function reply(statusCode: number, status: "ok" | "error", next: string) {
    if (redirectTo) {
      const redirectUrl = new URL(redirectTo, req.url)
      redirectUrl.searchParams.set("status", status)
      redirectUrl.searchParams.set("next", next)
      redirect(redirectUrl.toString())
    }

    return NextResponse.json({ status, next }, { status: statusCode })
  }

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, LEAD_PIPELINE_ROLES)) {
    return reply(403, "error", "forbidden")
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
    .limit(1)

  if (!lead) return reply(404, "error", "not_found")
  if (lead.status !== "submitted") return reply(409, "error", "invalid_transition")

  const now = new Date()
  await db
    .update(leads)
    .set({
      status: "lead_approved",
      approvedAt: lead.approvedAt ?? now,
      approvedBy: lead.approvedBy ?? userId,
      stageUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(leads.id, id))

  return reply(200, "ok", "lead_approved")
}
