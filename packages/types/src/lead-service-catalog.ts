import { LEAD_SERVICE_OPTIONS, type LeadServiceOption } from "./lead-service-options"

/**
 * Product / CRM-style short codes for lead service picklist labels (partner & admin UIs).
 */
const LEAD_SERVICE_CODE_BY_NAME = {
  "Corporate Tax Registration": "CTR",
  "Corporate Tax Filing": "CTF",
  "VAT Registration": "VATR",
  "VAT Filing": "VATF",
  "Monthly Accounting": "MACC",
  "Quarterly Accounting": "QACC",
  "Annual Accounting": "AACC",
  "Financial Statement Preparation": "FSP",
  Auditing: "AUD",
  Liquidation: "LIQ",
  "Audited Financial Statements": "AFS",
  "Management Accounting": "MACCT",
  "AML Compliance": "AMLC",
  "Fractional CFO - hourly": "CFO",
  "Financial Modelling": "FMOD",
  "FTA Amendments": "FTA",
  "Corporate Tax Deregistration": "CTDR",
  "VAT Deregistration": "VATDR",
  Accounting: "ACC",
  "Salary Benchmarking": "SBR",
} as const satisfies Record<LeadServiceOption, string>

export function leadServiceCode(name: string): string {
  if (Object.prototype.hasOwnProperty.call(LEAD_SERVICE_CODE_BY_NAME, name)) {
    return LEAD_SERVICE_CODE_BY_NAME[name as LeadServiceOption]
  }
  const compact = name
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 8)
    .toUpperCase()
  return compact || "—"
}

/** Static fallback when the database catalog is empty (bootstrap / migration). */
export function fallbackLeadCatalogRows(): { name: string; code: string }[] {
  return LEAD_SERVICE_OPTIONS.map((name) => ({
    name,
    code: leadServiceCode(name),
  }))
}

/** @deprecated Prefer DB-driven rows; this wraps the static fallback only. */
export function leadServiceCatalogRows(): { name: string; code: string }[] {
  return fallbackLeadCatalogRows()
}
