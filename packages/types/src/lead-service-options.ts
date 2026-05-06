/**
 * Canonical CRM-style picklist for lead “services of interest” (partner & admin portals).
 * Excludes partnership-intent-only options (“Looking for Partnership”).
 * Order matches product picklist screenshots (tiered SKU names consolidated to simple labels).
 */
export const LEAD_SERVICE_OPTIONS = [
  "Corporate Tax Registration",
  "Corporate Tax Filing",
  "VAT Registration",
  "VAT Filing",
  "Monthly Accounting",
  "Quarterly Accounting",
  "Annual Accounting",
  "Financial Statement Preparation",
  "Auditing",
  "Liquidation",
  "Audited Financial Statements",
  "Management Accounting",
  "AML Compliance",
  "Fractional CFO - hourly",
  "Financial Modelling",
  "FTA Amendments",
  "Corporate Tax Deregistration",
  "VAT Deregistration",
  "Accounting",
  "Salary Benchmarking",
] as const

export type LeadServiceOption = (typeof LEAD_SERVICE_OPTIONS)[number]

const catalogSet = new Set<string>(LEAD_SERVICE_OPTIONS)

export function mergeLeadServiceOptionsWithStored(selected: Iterable<string>): string[] {
  const extras: string[] = []
  for (const s of selected) {
    if (typeof s === "string" && s.trim() && !catalogSet.has(s)) {
      extras.push(s)
    }
  }
  extras.sort((a, b) => a.localeCompare(b))
  return [...LEAD_SERVICE_OPTIONS, ...extras]
}
