import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, partners } from "@repo/db"
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

  const [updated] = await db
    .update(partners)
    .set({
      status: "approved",
      onboardedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(partners.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 })
  }

  return NextResponse.json({ partner: updated })
}
