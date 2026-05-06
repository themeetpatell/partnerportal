/**
 * Single source for how full name maps to first/last columns and back to UI,
 * so partner and admin portals show the same contact breakdown.
 */
export function splitCustomerNameForStorage(customerName: string): {
  firstName: string | null
  lastName: string | null
} {
  const t = customerName.trim()
  if (!t) return { firstName: null, lastName: null }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: null, lastName: null }
  if (parts.length === 1) return { firstName: parts[0]!, lastName: null }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") }
}

/** Prefer stored first/last; if both empty, derive from `customerName` for display/edit seed. */
export function mergeLeadContactNamesForDisplay(lead: {
  customerName: string | null | undefined
  firstName: string | null | undefined
  lastName: string | null | undefined
}): { firstName: string; lastName: string } {
  const fn = lead.firstName?.trim() ?? ""
  const ln = lead.lastName?.trim() ?? ""
  if (fn || ln) {
    return { firstName: fn, lastName: ln }
  }
  const name = (lead.customerName ?? "").trim()
  if (!name) return { firstName: "", lastName: "" }
  const split = splitCustomerNameForStorage(name)
  return { firstName: split.firstName ?? "", lastName: split.lastName ?? "" }
}
