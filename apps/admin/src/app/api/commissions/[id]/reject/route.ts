import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, commissions, logActivity } from "@repo/db"
import { and, eq } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { hasAnyTeamRole } from "@/lib/rbac"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`commissions:reject:${userId}`, 20, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "finance"])) {
    return NextResponse.json({ error: "Forbidden — Finance/Admin only" }, { status: 403 })
  }

  const { id } = await params

  // Atomic: only update if still pending — prevents TOCTOU race
  const [updated] = await db
    .update(commissions)
    .set({
      status: "disputed",
      updatedAt: new Date(),
    })
    .where(and(eq(commissions.id, id), eq(commissions.status, "pending")))
    .returning()

  if (!updated) {
    const [existing] = await db
      .select({ status: commissions.status })
      .from(commissions)
      .where(eq(commissions.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 })
    }
    return NextResponse.json(
      { error: `Commission is already "${existing.status}". Only pending commissions can be rejected.` },
      { status: 422 }
    )
  }

  await logActivity({
    tenantId: updated.tenantId,
    entityType: "commission",
    entityId: updated.id,
    actorId: userId,
    actorName,
    action: "rejected",
    note: `Commission rejected by ${actorName}`,
    metadata: { amount: updated.amount, currency: updated.currency },
  })

  return NextResponse.redirect(new URL("/commissions", _req.url))
}
