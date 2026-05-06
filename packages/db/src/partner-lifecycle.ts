const DAY_MS = 24 * 60 * 60 * 1000

const QUALIFIED_STATUSES = new Set(["lead_qualified", "proposal_sent", "deal_won"])

export type PartnerOperationalStatus =
  | "active_partner"
  | "inactive_partner"
  | "yet_to_activate"
  | "yet_to_onboard"

export type PartnerOnboardingStage =
  | "yet_to_onboard"
  | "meeting_done"
  | "onboarded"
  | "nurturing"
  | "activated"

/** Cheap aggregate for profile/overview — avoids loading every lead row. */
export type PartnerLeadActivityRollup = {
  totalLeads: number
  /** Most recent lead `created_at`, or null when no leads */
  latestLeadAt: Date | string | null
  qualifiedInLast60Days: number
  anyInLast60Days: number
}

export function derivePartnerOperationalStatusFromRollup(
  partner: {
    status?: string | null
    contractStatus?: string | null
    contractSignedAt?: Date | string | null
    onboardedAt?: Date | string | null
  },
  rollup: PartnerLeadActivityRollup,
  now = new Date(),
): PartnerOperationalStatus {
  const hasWorkspaceApproval = partner.status === "approved" || Boolean(partner.onboardedAt)
  if (!hasWorkspaceApproval) {
    return "yet_to_onboard"
  }

  if (rollup.totalLeads === 0) {
    return "yet_to_activate"
  }

  const ninetyDaysAgo = now.getTime() - 90 * DAY_MS

  if (rollup.qualifiedInLast60Days > 0) {
    return "active_partner"
  }

  if (rollup.anyInLast60Days > 0) {
    return "active_partner"
  }

  const latest = rollup.latestLeadAt ? new Date(rollup.latestLeadAt).getTime() : 0
  if (rollup.totalLeads > 0 && latest < ninetyDaysAgo) {
    return "inactive_partner"
  }

  return "active_partner"
}

export function derivePartnerOperationalStatus(
  partner: {
    status?: string | null
    contractStatus?: string | null
    contractSignedAt?: Date | string | null
    onboardedAt?: Date | string | null
  },
  leads: { status: string; createdAt: Date | string }[],
  now = new Date(),
): PartnerOperationalStatus {
  const leadDates = leads.map((lead) => new Date(lead.createdAt).getTime())
  const qualifiedLeadDates = leads
    .filter((lead) => QUALIFIED_STATUSES.has(lead.status))
    .map((lead) => new Date(lead.createdAt).getTime())

  const sixtyDaysAgo = now.getTime() - 60 * DAY_MS

  let qualifiedInLast60Days = 0
  for (const ts of qualifiedLeadDates) {
    if (ts >= sixtyDaysAgo) qualifiedInLast60Days += 1
  }
  let anyInLast60Days = 0
  for (const ts of leadDates) {
    if (ts >= sixtyDaysAgo) anyInLast60Days += 1
  }
  let latestLeadAt: Date | string | null = null
  let latestMs = 0
  for (const lead of leads) {
    const t = new Date(lead.createdAt).getTime()
    if (t >= latestMs) {
      latestMs = t
      latestLeadAt = lead.createdAt
    }
  }

  return derivePartnerOperationalStatusFromRollup(
    partner,
    {
      totalLeads: leads.length,
      latestLeadAt,
      qualifiedInLast60Days,
      anyInLast60Days,
    },
    now,
  )
}

export function derivePartnerOnboardingStage(
  partner: {
    status?: string | null
    meetingCompletedAt?: Date | string | null
    onboardedAt?: Date | string | null
    nurturingStartedAt?: Date | string | null
  },
  leads: { createdAt: Date | string }[],
): PartnerOnboardingStage {
  if ((partner.onboardedAt || partner.status === "approved") && leads.length > 0) {
    return "activated"
  }

  if (partner.nurturingStartedAt) {
    return "nurturing"
  }

  if (partner.onboardedAt || partner.status === "approved") {
    return "onboarded"
  }

  if (partner.meetingCompletedAt) {
    return "meeting_done"
  }

  return "yet_to_onboard"
}

export function formatPartnerOperationalStatus(status: PartnerOperationalStatus) {
  return status.replaceAll("_", " ")
}

export function formatPartnerOnboardingStage(stage: PartnerOnboardingStage) {
  return stage.replaceAll("_", " ")
}
