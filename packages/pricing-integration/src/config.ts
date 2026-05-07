/** Base URL of the Replit / pricing engine (no trailing slash). */
export function getPricingEngineBaseUrl(): string | null {
  const raw = process.env.PRICING_ENGINE_BASE_URL?.trim()
  if (!raw) return null
  return raw.replace(/\/+$/, "")
}

export function getPricingEngineApiKey(): string | null {
  const k = process.env.PRICING_ENGINE_API_KEY?.trim()
  return k && k.length > 0 ? k : null
}

export function getPricingEngineQuotesPath(): string {
  const p = process.env.PRICING_ENGINE_QUOTES_PATH?.trim() || "/api/portal/v1/quotes"
  return p.startsWith("/") ? p : `/${p}`
}

export function getPricingEngineWebhookSecret(): string | null {
  const s = process.env.PRICING_ENGINE_WEBHOOK_SECRET?.trim()
  return s && s.length > 0 ? s : null
}

export function isPricingEngineIntegrationsEnabled(): boolean {
  return Boolean(getPricingEngineBaseUrl() && getPricingEngineApiKey())
}

/** When true (default), webhook events may advance lead pipeline (guarded by allowed transitions). */
export function isPricingEngineAutoPipeline(): boolean {
  const v = process.env.PRICING_ENGINE_AUTO_PIPELINE?.trim().toLowerCase()
  return v !== "false" && v !== "0" && v !== "no"
}

/** Minimum lead status for partner-initiated quote creation. */
export function getPartnerMinLeadStatusForPricing(): string {
  return process.env.PRICING_ENGINE_PARTNER_MIN_STATUS?.trim() || "lead_approved"
}

const PIPELINE_INDEX: Record<string, number> = {
  submitted: 0,
  lead_approved: 1,
  lead_follow_up: 2,
  lead_qualified: 3,
  proposal_sent: 4,
  deal_won: 5,
  deal_lost: 5,
}

export function partnerLeadMayCreatePricingQuote(leadStatus: string): boolean {
  if (leadStatus === "deal_won" || leadStatus === "deal_lost") {
    return false
  }

  const min = getPartnerMinLeadStatusForPricing()
  const iLead = PIPELINE_INDEX[leadStatus]
  const iMin = PIPELINE_INDEX[min]
  if (iLead === undefined || iMin === undefined) {
    return false
  }

  return iLead >= iMin
}
