import { auth, currentUser } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { db, logActivity, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import {
  sendPartnerApprovedEmail,
  sendPartnerContractReadyEmail,
  sendPartnerReactivatedEmail,
  sendPartnerSuspendedEmail,
  sendPartnerWorkspaceUnlockedEmail,
} from "@repo/notifications"
import { rateLimit } from "@repo/auth"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { hasAnyTeamRole } from "@/lib/rbac"

type LifecycleAction =
  | "approve"
  | "suspend"
  | "reactivate"
  | "send_contract"
  | "mark_meeting_done"
  | "mark_onboarded"
  | "start_nurturing"

function redirectToPartner(request: NextRequest, partnerId: string) {
  return NextResponse.redirect(new URL(`/partners/${partnerId}`, request.url))
}

function getPartnerAgreementUrl() {
  return "/dashboard/profile"
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`partner:lifecycle:${userId}`, 20, 60_000)
  if (limited) return limited

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "partnership_manager"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const user = await currentUser()
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Admin"

  const { id } = await params

  let action: unknown
  let reason: string | null = null

  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}))
    action = body.action
    const r = body.reason
    reason = typeof r === "string" && r.trim().length > 0 ? r.trim() : null
  } else {
    const form = await request.formData()
    action = form.get("action")
    const reasonField = form.get("reason")
    reason = typeof reasonField === "string" && reasonField.trim().length > 0 ? reasonField.trim() : null
  }

  if (typeof action !== "string") {
    return NextResponse.json({ error: "Missing lifecycle action" }, { status: 400 })
  }

  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.id, id))
    .limit(1)

  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 })
  }

  const now = new Date()
  const updates: Partial<typeof partner> & { updatedAt: Date } = {
    updatedAt: now,
  }
  let note = ""
  let emailAction: "approved" | "contract_ready" | "reactivated" | "suspended" | "workspace_unlocked" | null = null
  let logAction = "partner.lifecycle.updated"
  let logMetadata: Record<string, string> | undefined

  switch (action as LifecycleAction) {
    case "approve":
      updates.status = "approved"
      updates.rejectionReason = null
      updates.suspensionReason = null
      updates.activationDate = partner.activationDate ?? now
      note = "Partner application approved. Contract step pending before workspace unlock."
      emailAction = "approved"
      logAction = "partner.approved"
      break
    case "suspend":
      updates.status = "suspended"
      updates.suspensionReason = reason
      note = "Partner suspended and workspace access paused."
      emailAction = "suspended"
      logAction = "partner.suspended"
      logMetadata = reason ? { reason } : undefined
      break
    case "reactivate":
      updates.status = "approved"
      updates.rejectionReason = null
      updates.suspensionReason = null
      updates.activationDate = partner.activationDate ?? now
      note = "Partner reactivated and workspace access restored."
      emailAction = "reactivated"
      logAction = "partner.reactivated"
      break
    case "send_contract": {
      if (partner.contractStatus === "signed") {
        return NextResponse.json(
          { error: "This partner already has a signed contract on file." },
          { status: 400 }
        )
      }
      updates.agreementUrl = getPartnerAgreementUrl()
      updates.contractSentAt = now
      updates.contractStatus = "sent"
      updates.zohoSignRequestId = null
      note = "Contract shared in the partner portal for in-app signing."
      emailAction = "contract_ready"
      logAction = "partner.contract.sent"
      break
    }
    case "mark_meeting_done":
      updates.meetingCompletedAt = now
      updates.lastMetOn = now
      note = "Partner kickoff or onboarding meeting completed."
      logAction = "partner.meeting.completed"
      break
    case "mark_onboarded":
      if (!partner.contractSignedAt) {
        return NextResponse.json(
          { error: "Contract must be signed before a partner can be onboarded." },
          { status: 400 }
        )
      }
      updates.onboardedAt = now
      note = "Signed contract accepted. Partner marked as onboarded and workspace unlocked."
      emailAction = "workspace_unlocked"
      logAction = "partner.onboarded"
      break
    case "start_nurturing":
      updates.nurturingStartedAt = now
      note = "Partner moved into nurturing."
      logAction = "partner.nurturing.started"
      break
    default:
      return NextResponse.json({ error: "Unsupported lifecycle action." }, { status: 400 })
  }

  const [updated] = await db
    .update(partners)
    .set(updates)
    .where(eq(partners.id, id))
    .returning()

  await logActivity({
    tenantId: partner.tenantId,
    entityType: "partner",
    entityId: partner.id,
    actorId: userId,
    actorName,
    action: logAction,
    note,
    metadata: logMetadata,
  })

  if (emailAction === "approved") {
    await sendPartnerApprovedEmail(
      updated.email,
      updated.contactName,
      updated.companyName,
    )
  }

  if (emailAction === "reactivated") {
    await sendPartnerReactivatedEmail(
      updated.email,
      updated.contactName,
      updated.companyName,
    )
  }

  if (emailAction === "suspended") {
    await sendPartnerSuspendedEmail(
      updated.email,
      updated.contactName,
      updated.suspensionReason,
    )
  }

  if (emailAction === "contract_ready") {
    await sendPartnerContractReadyEmail(
      updated.email,
      updated.contactName,
      updated.companyName,
    )
  }

  if (emailAction === "workspace_unlocked") {
    await sendPartnerWorkspaceUnlockedEmail(
      updated.email,
      updated.contactName,
      updated.companyName,
    )
  }

  return redirectToPartner(request, id)
}
