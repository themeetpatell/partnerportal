import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, leads, partners, commissions, teamMembers } from "@repo/db"
import { eq, and } from "drizzle-orm"
import { calculateCommission } from "@repo/commission-engine"
import { sendLeadStatusEmail } from "@repo/notifications"
import { rateLimit } from "@repo/auth"
import { updateZohoDealStage } from "@repo/zoho"

const VALID_STATUSES = [
  "submitted",           // Lead created by partner
  "qualified",           // Lead qualified, deal created in Zoho CRM
  "proposal_sent",       // Proposal sent to customer
  "deal_won",            // Deal won in Zoho CRM
  "deal_lost",           // Deal lost in Zoho CRM
] as const

type LeadStatus = (typeof VALID_STATUSES)[number]

const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  submitted: ["qualified"],
  qualified: ["proposal_sent", "deal_lost"],
  proposal_sent: ["deal_won", "deal_lost"],
  deal_won: [],
  deal_lost: [],
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit: 30 status changes per user per minute
  const limited = rateLimit(`lead-status:${userId}`, 30, 60_000)
  if (limited) return limited

  // Verify role — admin, partnership, sales can transition lead status
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.authUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (!member || !["admin", "partnership", "sales"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  let body: { status?: string; reason?: string }
  const contentType = req.headers.get("content-type") ?? ""
  try {
    if (contentType.includes("application/json")) {
      body = await req.json()
    } else {
      const form = await req.formData()
      body = {
        status: form.get("status")?.toString(),
        reason: form.get("reason")?.toString(),
      }
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const newStatus = body.status as LeadStatus | undefined

  if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    )
  }

  // Load existing lead
  const [lead] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, id))
    .limit(1)

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const currentStatus = lead.status as LeadStatus
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] ?? []

  if (!allowedTransitions.includes(newStatus)) {
    return NextResponse.json(
      {
        error: `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowedTransitions.join(", ") || "none"}`,
      },
      { status: 422 }
    )
  }

  const updatePayload: Partial<typeof leads.$inferInsert> = {
    status: newStatus,
    updatedAt: new Date(),
  }

  // Handle deal_lost status
  if (newStatus === "deal_lost") {
    updatePayload.rejectionReason = body.reason || "Deal lost"
  }

  // Handle deal_won status - mark conversion time
  if (newStatus === "deal_won") {
    updatePayload.convertedAt = new Date()
  }

  const [updatedLead] = await db
    .update(leads)
    .set(updatePayload)
    .where(eq(leads.id, id))
    .returning()

  // Sync with Zoho CRM if there's a deal ID
  if (updatedLead?.zohoDealId) {
    try {
      let zohoStage = newStatus
      if (newStatus === "deal_won") zohoStage = "Closed Won"
      else if (newStatus === "deal_lost") zohoStage = "Closed Lost"
      else if (newStatus === "proposal_sent") zohoStage = "Proposal/Quotation"
      else if (newStatus === "qualified") zohoStage = "Qualification"

      const syncSuccess = await updateZohoDealStage(updatedLead.zohoDealId, zohoStage)
      if (!syncSuccess) {
        console.warn(`Failed to sync lead status to Zoho deal ${updatedLead.zohoDealId}`)
      }
    } catch (err) {
      console.error("Zoho sync error:", err)
    }
  }

  if (updatedLead) {
    try {
      const [partner] = await db
        .select()
        .from(partners)
        .where(eq(partners.id, updatedLead.partnerId))
        .limit(1)

      if (partner?.email) {
        await sendLeadStatusEmail(
          partner.email,
          updatedLead.customerCompany || updatedLead.customerName,
          newStatus
        )
      }
    } catch (err) {
      console.error("Lead status email failed:", err)
    }
  }

  // If deal_won: calculate and create a commission record
  if (newStatus === "deal_won" && updatedLead) {
    try {
      const [partner] = await db
        .select()
        .from(partners)
        .where(eq(partners.id, updatedLead.partnerId))
        .limit(1)

      if (partner?.commissionModelId) {
        // Count this partner's prior deal_won conversions for tiered models
        const priorConversions = await db
          .select()
          .from(leads)
          .where(eq(leads.partnerId, partner.id))

        const priorWon = priorConversions.filter(
          (l) => l.status === "deal_won" && l.id !== updatedLead.id
        ).length

        // Default service fee for commission calculation (AED 5000 placeholder)
        // In production this would come from the associated service request or deal value
        const defaultServiceFee = 5000

        const commissionResult = calculateCommission({
          model: {
            id: partner.commissionModelId,
            tenantId: partner.tenantId,
            name: "Partner Commission",
            type: "flat_pct",
            config: { pct: 10 },
            isActive: true,
            createdAt: new Date(),
          },
          serviceFee: defaultServiceFee,
          partnerConversionsThisPeriod: priorWon + 1,
          partnerLifetimeConversions: priorWon + 1,
        })

        if (commissionResult.amount > 0) {
          await db.insert(commissions).values({
            tenantId: partner.tenantId,
            partnerId: partner.id,
            sourceType: "lead",
            sourceId: updatedLead.id,
            amount: String(commissionResult.amount),
            currency: "AED",
            status: "pending",
            breakdown: commissionResult.breakdown,
            calculatedAt: new Date(),
          })
        }
      }
    } catch (err) {
      // Commission calculation failure should not fail the status update
      console.error("Commission calculation failed:", err)
    }
  }

  return NextResponse.redirect(new URL(`/leads/${id}`, req.url))
}
