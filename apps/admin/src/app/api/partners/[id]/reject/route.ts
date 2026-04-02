import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, partners, teamMembers, logActivity } from "@repo/db"
import { eq, and } from "drizzle-orm"
import { sendPartnerRejectedEmail } from "@repo/notifications"
import { rateLimit } from "@repo/auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit: 20 rejections per user per minute
  const limited = rateLimit(`reject:${userId}`, 20, 60_000)
  if (limited) return limited

  // Verify admin/partnership role
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.clerkUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (!member || !["admin", "partnership"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  let reason: string | undefined
  const contentType = req.headers.get("content-type") ?? ""
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json()
      reason = typeof body?.reason === "string" ? body.reason : undefined
    } else {
      const form = await req.formData()
      const r = form.get("reason")
      reason = typeof r === "string" && r ? r : undefined
    }
  } catch {
    // reason is optional
  }

  const [updated] = await db
    .update(partners)
    .set({
      status: "rejected",
      rejectionReason: reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(partners.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 })
  }

  await sendPartnerRejectedEmail(
    updated.email,
    updated.contactName,
    updated.rejectionReason
  )

  await logActivity({
    tenantId: updated.tenantId,
    actorId: userId,
    actorName: member.name,
    action: "partner.rejected",
    entityType: "partner",
    entityId: id,
    metadata: reason ? { reason } : undefined,
  })

  return NextResponse.redirect(new URL(`/partners/${id}`, req.url))
}
