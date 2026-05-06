import type Stripe from "stripe"
import { deriveNetCommissionBaseFromCrm, type CrmVatBasisOptions } from "@repo/commission-engine"

function minorToMajor(cents: unknown): number {
  if (typeof cents !== "number" || !Number.isFinite(cents) || cents <= 0) return 0
  return Math.round(cents) / 100
}

function hasStripeTaxExcludedTotal(invoice: Stripe.Invoice): boolean {
  const ex = invoice.total_excluding_tax
  const subEx = invoice.subtotal_excluding_tax
  return (
    (typeof ex === "number" && ex > 0) || (typeof subEx === "number" && subEx > 0)
  )
}

/**
 * Map a paid Stripe invoice to a commissionable base (major currency units),
 * then apply the same VAT derivation rules as CRM where needed.
 */
export function commissionBasisFromStripeInvoice(
  invoice: Stripe.Invoice,
  vatOpts: CrmVatBasisOptions,
) {
  let grossMajor = 0
  const ex = invoice.total_excluding_tax
  const subEx = invoice.subtotal_excluding_tax
  if (typeof ex === "number" && ex > 0) {
    grossMajor = minorToMajor(ex)
  } else if (typeof subEx === "number" && subEx > 0) {
    grossMajor = minorToMajor(subEx)
  } else if (typeof invoice.subtotal === "number" && invoice.subtotal > 0) {
    grossMajor = minorToMajor(invoice.subtotal)
  } else if (typeof invoice.amount_paid === "number" && invoice.amount_paid > 0) {
    grossMajor = minorToMajor(invoice.amount_paid)
  }

  const taxExcluded = hasStripeTaxExcludedTotal(invoice)
  const effectiveVat: CrmVatBasisOptions = taxExcluded
    ? { ...vatOpts, crmAmountIncludesVat: false }
    : vatOpts

  const basis = deriveNetCommissionBaseFromCrm(grossMajor, effectiveVat)

  return {
    ...basis,
    stripeTaxExcluded: taxExcluded,
    stripeCurrency: invoice.currency ?? "aed",
  }
}
