import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, leads, partners, commissions } from "@repo/db"
import { eq } from "drizzle-orm"
import { calculateCommission } from "@repo/commission-engine"
import { sendLeadStatusEmail } from "@repo/notifications"

const VALID_STATUSES = [
  "submitted",
  "in_review",
  "qualified",
  "proposal_sent",
  "converted",
  "rejected",
] as const

type LeadStatus = (typeof VALID_STATUSES)[number]

const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  submitted: ["in_review"],
  in_review: ["qualified", "rejected"],
  qualified: ["proposal_sent", "rejected"],
  proposal_sent: ["converted", "rejected"],
  converted: [],
  rejected: [],
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

  if (newStatus === "rejected" && body.reason) {
    updatePayload.rejectionReason = body.reason
  }

  if (newStatus === "converted") {
    updatePayload.convertedAt = new Date()
  }

  const [updatedLead] = await db
    .update(leads)
    .set(updatePayload)
    .where(eq(leads.id, id))
    .returning()

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

  // If converted: calculate and create a commission record
  if (newStatus === "converted" && updatedLead) {
    try {
      const [partner] = await db
        .select()
        .from(partners)
        .where(eq(partners.id, updatedLead.partnerId))
        .limit(1)

      if (partner?.commissionModelId) {
        // Count this partner's prior conversions for tiered models
        const priorConversions = await db
          .select()
          .from(leads)
          .where(eq(leads.partnerId, partner.id))

        const priorConverted = priorConversions.filter(
          (l) => l.status === "converted" && l.id !== updatedLead.id
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
          partnerConversionsThisPeriod: priorConverted + 1,
          partnerLifetimeConversions: priorConverted + 1,
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
