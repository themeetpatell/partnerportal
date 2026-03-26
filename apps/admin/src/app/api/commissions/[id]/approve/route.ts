import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, commissions } from "@repo/db"
import { eq } from "drizzle-orm"

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

  return NextResponse.json({ commission: updated })
}
