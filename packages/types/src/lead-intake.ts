/** Intake classification: net-new introduction vs. follow-on from an existing / won client. */
export const LEAD_INTAKE_NEW = "new_lead" as const
export const LEAD_INTAKE_EXISTING = "existing_lead" as const

export const LEAD_INTAKE_TYPES = [LEAD_INTAKE_NEW, LEAD_INTAKE_EXISTING] as const
export type LeadIntakeType = (typeof LEAD_INTAKE_TYPES)[number]

export function isLeadIntakeType(value: string | null | undefined): value is LeadIntakeType {
  return value === LEAD_INTAKE_NEW || value === LEAD_INTAKE_EXISTING
}

export function intakeTypeLabel(value: string | null | undefined): "New lead" | "Existing lead" {
  return value === LEAD_INTAKE_EXISTING ? "Existing lead" : "New lead"
}

/** Inbox `kind` query: supports legacy `net_new` / `cross_sell` URLs. */
export type LeadInboxKindFilter = "all" | "new_only" | "existing_only"

export function parseLeadInboxKindParam(raw: string | undefined): LeadInboxKindFilter {
  if (raw === "net_new" || raw === "new") return "new_only"
  if (raw === "cross_sell" || raw === "existing") return "existing_only"
  return "all"
}
