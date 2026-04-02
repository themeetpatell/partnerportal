import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, partners, teamMembers, logActivity } from "@repo/db"
import { eq, and } from "drizzle-orm"
import { sendPartnerApprovedEmail } from "@repo/notifications"
import { rateLimit } from "@repo/auth"
import { hasAnyTeamRole } from "@/lib/rbac"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit: 20 approvals per user per minute
  const limited = rateLimit(`approve:${userId}`, 20, 60_000)
  if (limited) return limited

  // Verify admin/partnership role
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.authUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "partnership_manager"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const now = new Date()

  const [updated] = await db
    .update(partners)
    .set({
      status: "approved",
      rejectionReason: null,
      suspensionReason: null,
      activationDate: now,
      updatedAt: now,
    })
    .where(eq(partners.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 })
  }

  await sendPartnerApprovedEmail(
    updated.email,
    updated.contactName,
    updated.companyName,
  )

  await logActivity({
    tenantId: updated.tenantId,
    actorId: userId,
    actorName: member.name,
    action: "partner.approved",
    entityType: "partner",
    entityId: id,
    note: "Partner approved. Workspace unlocks after contract signing and admin acceptance.",
  })

  return NextResponse.redirect(new URL(`/partners/${id}`, _req.url))
}
