/**
 * CRM commonly stores UAE deal values VAT-inclusive; partner % is usually applied to
 * net-of-VAT revenue to avoid paying commission on tax.
 */
export type CrmVatBasisOptions = {
  /** When true, `amountFromCrm` is treated as VAT-inclusive and net = gross / (1 + vat/100). */
  crmAmountIncludesVat: boolean
  /** Standard rate, e.g. 5 for UAE. */
  vatRatePct: number
}

export type CrmCommissionBasis = {
  /** Value taken from CRM (AR preferred over Amount in caller). */
  grossFromCrm: number
  /** Amount partner % is applied to. */
  netForCommission: number
  vatRatePct: number
  crmAmountIncludesVat: boolean
  /** Human-readable line for commission.breakdown / audit JSON. */
  summaryLine: string
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function deriveNetCommissionBaseFromCrm(
  amountFromCrm: number,
  options: CrmVatBasisOptions,
): CrmCommissionBasis {
  const { crmAmountIncludesVat, vatRatePct } = options

  const grossFromCrm = roundMoney(amountFromCrm)

  let netForCommission = grossFromCrm
  if (crmAmountIncludesVat && vatRatePct > 0) {
    netForCommission = roundMoney(grossFromCrm / (1 + vatRatePct / 100))
  }

  const summaryLine = crmAmountIncludesVat
    ? `CRM basis AED ${grossFromCrm} incl. ${vatRatePct}% VAT → net AED ${netForCommission} for commission %`
    : `CRM basis AED ${grossFromCrm} (excl. VAT); commission % on full amount`

  return {
    grossFromCrm,
    netForCommission,
    vatRatePct,
    crmAmountIncludesVat,
    summaryLine,
  }
}
