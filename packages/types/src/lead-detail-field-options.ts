/** Shared lead form option lists so admin and partner UIs stay aligned. */

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
