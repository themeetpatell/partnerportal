/** Shared lead form option lists so admin and partner UIs stay aligned. */

/** Lead industry + partner profile industry (same picklist). */
export const LEAD_INDUSTRY_OPTIONS = [
  "Accounting & Bookkeeping",
  "Advertising & Media",
  "Agriculture",
  "Automotive",
  "Aviation",
  "Construction & Engineering",
  "Consulting & Professional Services",
  "E-commerce & Retail",
  "Education & Training",
  "Energy & Utilities",
  "Financial Services",
  "Food & Beverage",
  "Government & Public Sector",
  "Healthcare & Life Sciences",
  "Hospitality & Tourism",
  "HR & Recruitment",
  "IT & Software",
  "Legal Services",
  "Logistics & Supply Chain",
  "Manufacturing",
  "Maritime & Shipping",
  "Marketing & PR",
  "Non-profit",
  "Oil & Gas",
  "Pharmaceuticals",
  "Real Estate & Property",
  "Telecommunications",
  "Trading & Commodities",
  "Other",
] as const

export type LeadIndustryOption = (typeof LEAD_INDUSTRY_OPTIONS)[number]

export const PAYMENT_RECURRING_SLUGS = [
  "monthly",
  "quarterly",
  "annually",
  "bi_annual",
] as const

export type PaymentRecurringSlug = (typeof PAYMENT_RECURRING_SLUGS)[number]

export function isPaymentRecurringSlug(value: string | null | undefined): value is PaymentRecurringSlug {
  return typeof value === "string" && (PAYMENT_RECURRING_SLUGS as readonly string[]).includes(value)
}

export const PAYMENT_RECURRING_OPTIONS: { label: string; value: PaymentRecurringSlug }[] = [
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Annually", value: "annually" },
  { label: "Bi-annual", value: "bi_annual" },
]

export const LEAD_TRANSACTION_BANDS = [
  "<50",
  "50-100",
  "100-200",
  "200-500",
  "500-1000",
  "1000-2000",
  "2000+",
] as const

export const LEAD_BUSINESS_AR_BANDS = [
  "0-100K",
  "100K-375K",
  "375K-1M",
  "1M-5M",
  "5M+",
] as const

export const LEAD_DECISION_ROLES = [
  "Founder/CEO",
  "CFO / Finance Manager",
  "Accountant / Analyst",
  "Operations / Support",
  "Other",
] as const

export const LEAD_URGENCY_TIMELINES = [
  "Immediately",
  "Within A Week",
  "Within A Month",
  "Within 3 Months",
  "After 3 Months",
] as const

export const LEAD_LOST_REASONS = [
  "Price too high",
  "No response",
  "Chose competitor",
  "No budget",
  "Timing issue",
  "Not qualified",
  "Other",
] as const

export function leadSelectOptions(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }))
}
