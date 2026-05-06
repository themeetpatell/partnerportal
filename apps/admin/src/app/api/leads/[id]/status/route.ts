import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { rateLimit } from "@repo/auth"
import { db, leads, partners } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import {
  LEAD_STATUS_TRANSITIONS,
  LeadStatusSchema,
  type LeadStatus,
} from "@repo/types"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { createDealCloseCommissionFromLead } from "@/lib/create-lead-commissions"
import { hasAnyTeamRole, LEAD_PIPELINE_ROLES } from "@/lib/rbac"

const PIPELINE_STATUSES = LeadStatusSchema.options

type PipelineStatus = LeadStatus
const TRANSITIONS = LEAD_STATUS_TRANSITIONS

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`lead-status:${userId}`, 30, 60_000)
  if (limited) return limited

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, LEAD_PIPELINE_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const contentType = req.headers.get("content-type") || ""
  const body =
    contentType.includes("application/json")
      ? await req.json().catch(() => ({}))
      : Object.fromEntries((await req.formData()).entries())
  const requestedStatus = typeof body?.status === "string" ? body.status : null

  if (!PIPELINE_STATUSES.includes(requestedStatus as LeadStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 422 })
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
    .limit(1)

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const currentStatus = lead.status as PipelineStatus
  const nextStatus = requestedStatus as PipelineStatus

  if (currentStatus === nextStatus) {
    return NextResponse.json({ success: true, lead })
  }

  if (!TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    return NextResponse.json(
      {
        error: `Invalid transition from ${currentStatus} to ${nextStatus}`,
      },
      { status: 409 },
    )
  }

  const now = new Date()
  const [updatedLead] = await db
    .update(leads)
    .set({
      status: nextStatus,
      stageNotes:
        typeof body?.stageNotes === "string" && body.stageNotes.trim().length > 0
          ? body.stageNotes.trim()
          : lead.stageNotes,
      proposalSummary:
        typeof body?.proposalSummary === "string" ? body.proposalSummary.trim() || null : lead.proposalSummary,
      proposalAmount:
        typeof body?.proposalAmount === "string" && body.proposalAmount.trim().length > 0
          ? body.proposalAmount.trim()
          : lead.proposalAmount,
      paymentStatus:
        typeof body?.paymentStatus === "string" ? body.paymentStatus.trim() || null : lead.paymentStatus,
      paymentReference:
        typeof body?.paymentReference === "string"
          ? body.paymentReference.trim() || null
          : lead.paymentReference,
      paymentAmount:
        typeof body?.paymentAmount === "string" && body.paymentAmount.trim().length > 0
          ? body.paymentAmount.trim()
          : lead.paymentAmount,
      approvedAt: nextStatus === "lead_approved" ? lead.approvedAt ?? now : lead.approvedAt,
      approvedBy: nextStatus === "lead_approved" ? lead.approvedBy ?? userId : lead.approvedBy,
      proposalSentAt: nextStatus === "proposal_sent" ? lead.proposalSentAt ?? now : lead.proposalSentAt,
      paymentDate: nextStatus === "deal_won" ? lead.paymentDate ?? now : lead.paymentDate,
      convertedAt: nextStatus === "deal_won" ? lead.convertedAt ?? now : lead.convertedAt,
      lostReason:
        nextStatus === "deal_lost"
          ? (typeof body?.lostReason === "string" && body.lostReason.trim()) || lead.lostReason || null
          : null,
      rejectionReason:
        nextStatus === "deal_lost"
          ? (typeof body?.lostReason === "string" && body.lostReason.trim())
            || (typeof body?.rejectionReason === "string" && body.rejectionReason.trim())
            || "Marked as lost"
          : null,
      stageUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(leads.id, id))
    .returning()

  if (nextStatus === "deal_won" && updatedLead) {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.id, updatedLead.partnerId))
      .limit(1)
    if (partner) {
      const actorName = await getActorName()
      const commissionResult = await createDealCloseCommissionFromLead({
        lead: updatedLead,
        partner,
        actorUserId: userId,
        actorName,
      })
      if (!commissionResult.ok && commissionResult.reason !== "duplicate") {
        console.warn(
          "[lead-status deal_won] deal-close commission not created:",
          commissionResult.reason,
          "leadId=",
          updatedLead.id,
        )
      }
    }
  }

  const redirectTo = new URL(req.url).searchParams.get("redirectTo") || `/leads/${id}`
  const redirectUrl = new URL(redirectTo, req.url)
  redirectUrl.searchParams.set("status", "ok")
  redirectUrl.searchParams.set("next", nextStatus)

  if ((req.headers.get("accept") || "").includes("text/html")) {
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.json({ success: true, lead: updatedLead })
}
