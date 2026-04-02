const DAY_MS = 24 * 60 * 60 * 1000

const QUALIFIED_STATUSES = new Set(["qualified", "proposal_sent", "deal_won"])

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

export function derivePartnerOperationalStatus(
  partner: {
    contractStatus?: string | null
    contractSignedAt?: Date | string | null
    onboardedAt?: Date | string | null
  },
  leads: { status: string; createdAt: Date | string }[],
  now = new Date(),
): PartnerOperationalStatus {
  const hasSignedContract =
    partner.contractStatus === "signed" || Boolean(partner.contractSignedAt)
  if (!hasSignedContract) {
    return "yet_to_onboard"
  }

  if (!partner.onboardedAt) {
    return "yet_to_onboard"
  }

  const leadDates = leads.map((lead) => new Date(lead.createdAt).getTime())
  const qualifiedLeadDates = leads
    .filter((lead) => QUALIFIED_STATUSES.has(lead.status))
    .map((lead) => new Date(lead.createdAt).getTime())

  if (leadDates.length === 0) {
    return "yet_to_activate"
  }

  const sixtyDaysAgo = now.getTime() - 60 * DAY_MS
  const ninetyDaysAgo = now.getTime() - 90 * DAY_MS

  if (qualifiedLeadDates.some((timestamp) => timestamp >= sixtyDaysAgo)) {
    return "active_partner"
  }

  if (leadDates.some((timestamp) => timestamp >= sixtyDaysAgo)) {
    return "active_partner"
  }

  if (leadDates.length > 0 && leadDates.every((timestamp) => timestamp < ninetyDaysAgo)) {
    return "inactive_partner"
  }

  return "active_partner"
}

export function derivePartnerOnboardingStage(
  partner: {
    meetingCompletedAt?: Date | string | null
    onboardedAt?: Date | string | null
    nurturingStartedAt?: Date | string | null
  },
  leads: { createdAt: Date | string }[],
): PartnerOnboardingStage {
  if (partner.onboardedAt && leads.length > 0) {
    return "activated"
  }

  if (partner.nurturingStartedAt) {
    return "nurturing"
  }

  if (partner.onboardedAt) {
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
