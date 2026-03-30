import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, commissions, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import { sendCommissionApprovedEmail } from "@repo/notifications"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

  if (existing.status !== "pending") {
    return NextResponse.json(
      {
        error: `Commission is already "${existing.status}". Only pending commissions can be approved.`,
      },
      { status: 422 }
    )
  }

  const [updated] = await db
    .update(commissions)
    .set({
      status: "approved",
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(commissions.id, id))
    .returning()

  if (updated) {
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
  }

  return NextResponse.redirect(new URL("/commissions", _req.url))
}
