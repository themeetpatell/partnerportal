import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, leads, teamMembers } from "@repo/db"
import { eq, and } from "drizzle-orm"
import { fetchZohoDeal, mapZohoDealStageToLeadStatus } from "@repo/zoho"
import { rateLimit } from "@repo/auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit: 10 syncs per user per minute
  const limited = rateLimit(`lead-sync:${userId}`, 10, 60_000)
  if (limited) return limited

  // Verify role — admin, partnership, sales can sync lead status
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.authUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (!member || !["admin", "partnership", "sales"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  // Load existing lead
  const [lead] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, id))
    .limit(1)

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  if (!lead.zohoDealId) {
    return NextResponse.json(
      { error: "Lead has no associated Zoho deal" },
      { status: 400 }
    )
  }

  try {
    // Fetch the deal from Zoho
    const zohoDeal = await fetchZohoDeal(lead.zohoDealId)
    if (!zohoDeal) {
      return NextResponse.json(
        { error: "Could not fetch deal from Zoho CRM" },
        { status: 500 }
      )
    }

    // Map Zoho deal stage to our lead status
    const newStatus = mapZohoDealStageToLeadStatus(zohoDeal.Stage)

    // Only update if status changed
    if (newStatus !== lead.status) {
      const updatePayload: Partial<typeof leads.$inferInsert> = {
        status: newStatus,
        updatedAt: new Date(),
      }

      if (newStatus === "deal_won") {
        updatePayload.convertedAt = new Date()
      }

      const [updatedLead] = await db
        .update(leads)
        .set(updatePayload)
        .where(eq(leads.id, id))
        .returning()

      return NextResponse.json({
        success: true,
        message: `Lead status synced from Zoho: ${lead.status} → ${newStatus}`,
        lead: updatedLead,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Lead status already matches Zoho deal stage",
      lead,
    })
  } catch (err) {
    console.error("[lead sync] Error:", err)
    return NextResponse.json(
      { error: "Failed to sync lead status from Zoho" },
      { status: 500 }
    )
  }
}
