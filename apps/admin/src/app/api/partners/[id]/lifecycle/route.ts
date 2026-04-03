import { auth, currentUser } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { db, logActivity, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import {
  sendPartnerApprovedEmail,
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
  return "/onboarding"
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
  let emailAction: "approved" | "reactivated" | "suspended" | "workspace_unlocked" | null = null
  let logAction = "partner.lifecycle.updated"
  let logMetadata: Record<string, string> | undefined

  switch (action as LifecycleAction) {
    case "approve":
      updates.status = "approved"
      updates.rejectionReason = null
      updates.suspensionReason = null
      updates.activationDate = partner.activationDate ?? now
      updates.onboardedAt = partner.onboardedAt ?? now
      updates.contractStatus = "signed"
      updates.contractSignedAt = partner.contractSignedAt ?? now
      updates.contractSignedName = partner.contractSignedName ?? partner.contactName
      updates.contractSignedDesignation = partner.contractSignedDesignation ?? partner.designation
      updates.contractSignatureType = partner.contractSignatureType ?? "onboarding_acceptance"
      note = "Partner application approved and workspace unlocked. Agreement acknowledgement was already completed during onboarding."
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
      updates.agreementUrl = getPartnerAgreementUrl()
      updates.contractSentAt = partner.contractSentAt ?? now
      updates.contractStatus = "signed"
      updates.contractSignedAt = partner.contractSignedAt ?? partner.contractSentAt ?? now
      updates.contractSignedName = partner.contractSignedName ?? partner.contactName
      updates.contractSignedDesignation = partner.contractSignedDesignation ?? partner.designation
      updates.contractSignatureType = partner.contractSignatureType ?? "onboarding_acceptance"
      updates.onboardedAt = partner.onboardedAt ?? now
      updates.zohoSignRequestId = null
      note = "Legacy contract action mapped to onboarding acceptance. Workspace remains unlocked without a separate contract step."
      emailAction = partner.onboardedAt ? null : "workspace_unlocked"
      logAction = "partner.contract.bypassed"
      break
    }
    case "mark_meeting_done":
      updates.meetingCompletedAt = now
      updates.lastMetOn = now
      note = "Partner kickoff or onboarding meeting completed."
      logAction = "partner.meeting.completed"
      break
    case "mark_onboarded":
      updates.onboardedAt = now
      updates.contractStatus = "signed"
      updates.contractSignedAt = partner.contractSignedAt ?? now
      updates.contractSignedName = partner.contractSignedName ?? partner.contactName
      updates.contractSignedDesignation = partner.contractSignedDesignation ?? partner.designation
      updates.contractSignatureType = partner.contractSignatureType ?? "onboarding_acceptance"
      note = "Partner marked as onboarded. Separate contract acceptance is no longer required."
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

  if (emailAction === "workspace_unlocked") {
    await sendPartnerWorkspaceUnlockedEmail(
      updated.email,
      updated.contactName,
      updated.companyName,
    )
  }

  return redirectToPartner(request, id)
}
