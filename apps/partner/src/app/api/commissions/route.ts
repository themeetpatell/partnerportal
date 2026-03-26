import { auth } from "@clerk/nextjs/server"
import { db, partners, commissions } from "@repo/db"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.clerkUserId, userId))
    .limit(1)

  if (!partner) return NextResponse.json({ commissions: [] })

  const rows = await db
    .select()
    .from(commissions)
    .where(eq(commissions.partnerId, partner.id))
    .orderBy(commissions.createdAt)

  return NextResponse.json({ commissions: rows })
}
