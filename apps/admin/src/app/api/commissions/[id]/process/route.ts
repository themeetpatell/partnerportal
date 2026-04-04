import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, commissions, logActivity, payoutRequests } from "@repo/db"
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

  const limited = rateLimit(`commissions:process:${userId}`, 20, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "finance"])) {
    return NextResponse.json({ error: "Forbidden — Finance/Admin only" }, { status: 403 })
  }

  const { id } = await params

  class TransactionAbort extends Error {
    constructor(public readonly response: Response) {
      super()
    }
  }

  try {
    await db.transaction(async (tx) => {
      // Atomic: only update if still approved — prevents TOCTOU race
      const [updated] = await tx
        .update(commissions)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(and(eq(commissions.id, id), eq(commissions.status, "approved")))
        .returning()

      if (!updated) {
        const [existing] = await tx
          .select({ status: commissions.status })
          .from(commissions)
          .where(eq(commissions.id, id))
          .limit(1)

        if (!existing) {
          throw new TransactionAbort(
            NextResponse.json({ error: "Commission not found" }, { status: 404 })
          )
        }
        throw new TransactionAbort(
          NextResponse.json(
            { error: `Commission is already "${existing.status}". Only approved commissions can enter payout processing.` },
            { status: 422 }
          )
        )
      }

      const [payout] = await tx
        .insert(payoutRequests)
        .values({
          tenantId: updated.tenantId,
          partnerId: updated.partnerId,
          commissionId: updated.id,
          amount: updated.amount,
          currency: updated.currency,
          status: "processing",
        })
        .returning()

      await logActivity({
        tenantId: updated.tenantId,
        entityType: "commission",
        entityId: updated.id,
        actorId: userId,
        actorName,
        action: "payout_started",
        note: `Payout started by ${actorName}`,
        metadata: {
          amount: updated.amount,
          currency: updated.currency,
          payoutRequestId: payout?.id ?? null,
        },
      })
    })
  } catch (e) {
    if (e instanceof TransactionAbort) return e.response
    throw e
  }

  return NextResponse.redirect(new URL("/commissions?status=processing", _req.url))
}
