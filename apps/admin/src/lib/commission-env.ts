import type { CrmVatBasisOptions } from "@repo/commission-engine"

export function getCommissionVatOptionsFromEnv(): CrmVatBasisOptions {
  const crmAmountIncludesVat =
    process.env.COMMISSION_CRM_AMOUNT_INCLUDES_VAT === "true" ||
    process.env.COMMISSION_CRM_AMOUNT_INCLUDES_VAT === "1"

  const raw = process.env.COMMISSION_VAT_RATE_PCT
  const parsed = raw != null && raw !== "" ? Number(raw) : 5
  const vatRatePct =
    Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 5

  return { crmAmountIncludesVat, vatRatePct }
}

export function approvalRequiresStripeInvoice(): boolean {
  return (
    process.env.COMMISSION_APPROVAL_REQUIRES_STRIPE_INVOICE === "true" ||
    process.env.COMMISSION_APPROVAL_REQUIRES_STRIPE_INVOICE === "1"
  )
}
