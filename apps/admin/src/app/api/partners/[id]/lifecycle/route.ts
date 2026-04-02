import { auth, currentUser } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { db, logActivity, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import { sendWelcomeEmail } from "@repo/notifications"

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

function getPartnerAgreementUrl(type: string) {
  const partnerAppUrl =
    process.env.NEXT_PUBLIC_PARTNER_APP_URL || "http://localhost:3000"

  const filePath =
    type === "channel"
      ? "/contracts/channel-partner-agreement-2026-v1-2.docx"
      : "/contracts/referral-partner-agreement-2026-v1-2.docx"

  return `${partnerAppUrl}${filePath}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await currentUser()
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.emailAddresses[0]?.emailAddress ||
    "Admin"

  const { id } = await params
  const form = await request.formData()
  const action = form.get("action")

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
  let shouldSendWelcome = false

  switch (action as LifecycleAction) {
    case "approve":
      updates.status = "approved"
      updates.rejectionReason = null
      note = "Partner approved."
      shouldSendWelcome = true
      break
    case "suspend":
      updates.status = "suspended"
      note = "Partner suspended."
      break
    case "reactivate":
      updates.status = "approved"
      updates.rejectionReason = null
      note = "Partner reactivated."
      break
    case "send_contract": {
      if (partner.contractStatus === "signed") {
        return NextResponse.json(
          { error: "This partner already has a signed contract on file." },
          { status: 400 }
        )
      }
      updates.agreementUrl = getPartnerAgreementUrl(partner.type)
      updates.contractSentAt = now
      updates.contractStatus = "sent"
      note = "Contract shared for in-portal signing."
      break
    }
    case "mark_meeting_done":
      updates.meetingCompletedAt = now
      updates.lastMetOn = now
      note = "Partner kickoff or onboarding meeting completed."
      break
    case "mark_onboarded":
      if (!partner.contractSignedAt) {
        return NextResponse.json(
          { error: "Contract must be signed before a partner can be onboarded." },
          { status: 400 }
        )
      }
      updates.onboardedAt = now
      note = "Partner marked as onboarded."
      break
    case "start_nurturing":
      updates.nurturingStartedAt = now
      note = "Partner moved into nurturing."
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
    action: "updated",
    note,
  })

  if (shouldSendWelcome) {
    await sendWelcomeEmail(updated.email, updated.contactName)
  }

  return redirectToPartner(request, id)
}
