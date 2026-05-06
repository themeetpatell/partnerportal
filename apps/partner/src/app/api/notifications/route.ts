import { auth, currentUser } from "@repo/auth/server"
import { NextResponse } from "next/server"
import { and, desc, eq, isNull, or } from "drizzle-orm"
import { db, notifications } from "@repo/db"
import { getPartnerRecordForAuthenticatedUser } from "@/lib/partner-record"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const user = await currentUser()
  const partner = await getPartnerRecordForAuthenticatedUser({ userId, email: user?.email })
  if (!partner) return NextResponse.json({ notifications: [] })

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, partner.tenantId),
        or(eq(notifications.partnerId, partner.id), isNull(notifications.partnerId)),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(30)

  return NextResponse.json({ notifications: rows })
}

export async function PATCH() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const user = await currentUser()
  const partner = await getPartnerRecordForAuthenticatedUser({ userId, email: user?.email })
  if (!partner) return NextResponse.json({ success: true })

  await db
    .update(notifications)
    .set({ isRead: "true" })
    .where(
      and(
        eq(notifications.tenantId, partner.tenantId),
        eq(notifications.partnerId, partner.id),
      ),
    )

  return NextResponse.json({ success: true })
}