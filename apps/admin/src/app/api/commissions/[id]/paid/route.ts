import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, commissions, logActivity, partners, payoutRequests } from "@repo/db"
import { and, eq } from "drizzle-orm"
import { sendCommissionPaidEmail } from "@repo/notifications"
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

  const limited = rateLimit(`commissions:paid:${userId}`, 20, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "finance"])) {
    return NextResponse.json({ error: "Forbidden — Finance/Admin only" }, { status: 403 })
  }

  const { id } = await params

  const [existing] = await db
    .select()
    .from(commissions)
    .where(eq(commissions.id, id))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: "Commission not found" }, { status: 404 })
  }

  if (existing.status !== "processing") {
    return NextResponse.json(
      {
        error: `Commission is already "${existing.status}". Only processing commissions can be marked as paid.`,
      },
      { status: 422 }
    )
  }

  let updatedPartnerEmail: string | null = null

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(commissions)
      .set({
        status: "paid",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(commissions.id, id))
      .returning()

    if (!updated) return

    await tx
      .update(payoutRequests)
      .set({
        status: "paid",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(payoutRequests.commissionId, updated.id),
          eq(payoutRequests.status, "processing")
        )
      )

    const [partner] = await tx
      .select()
      .from(partners)
      .where(eq(partners.id, updated.partnerId))
      .limit(1)

    updatedPartnerEmail = partner?.email ?? null

    await logActivity({
      tenantId: updated.tenantId,
      entityType: "commission",
      entityId: updated.id,
      actorId: userId,
      actorName,
      action: "paid",
      note: `Commission marked as paid by ${actorName}`,
      metadata: { amount: updated.amount, currency: updated.currency },
    })
  })

  if (updatedPartnerEmail) {
    try {
      await sendCommissionPaidEmail(
        updatedPartnerEmail,
        Number(existing.amount),
        existing.currency
      )
    } catch (err) {
      console.error("Commission paid email failed:", err)
    }
  }

  return NextResponse.redirect(new URL("/commissions?status=paid", _req.url))
}
