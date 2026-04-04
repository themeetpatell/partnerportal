import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, commissions, partners, logActivity } from "@repo/db"
import { and, eq } from "drizzle-orm"
import { sendCommissionApprovedEmail } from "@repo/notifications"
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

  const limited = rateLimit(`commissions:approve:${userId}`, 20, 60_000)
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
      status: "approved",
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(commissions.id, id), eq(commissions.status, "pending")))
    .returning()

  if (!updated) {
    // Either not found or already transitioned
    const [existing] = await db
      .select({ status: commissions.status })
      .from(commissions)
      .where(eq(commissions.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 })
    }
    return NextResponse.json(
      { error: `Commission is already "${existing.status}". Only pending commissions can be approved.` },
      { status: 422 }
    )
  }

  await logActivity({
    tenantId: updated.tenantId,
    entityType: "commission",
    entityId: updated.id,
    actorId: userId,
    actorName,
    action: "approved",
    note: `Commission approved by ${actorName}`,
    metadata: { amount: updated.amount, currency: updated.currency },
  })

  try {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.id, updated.partnerId))
      .limit(1)

    if (partner?.email) {
      await sendCommissionApprovedEmail(
        partner.email,
        Number(updated.amount),
        updated.currency
      )
    }
  } catch (err) {
    console.error("Commission approval email failed:", err)
  }

  return NextResponse.redirect(new URL("/commissions", _req.url))
}
