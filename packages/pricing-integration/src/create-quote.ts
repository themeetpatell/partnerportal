import {
  getPricingEngineApiKey,
  getPricingEngineBaseUrl,
  getPricingEngineQuotesPath,
} from "./config"
import type { CreatePortalQuoteRequest } from "./contracts"

export type CreatePortalQuoteSuccess = {
  ok: true
  engine_quote_id: string
  engine_quote_number?: string | null
  deep_link_url?: string | null
  proposal_view_url?: string | null
}

export type CreatePortalQuoteFailure = {
  ok: false
  error: string
  status?: number
}

function parseQuoteResponse(json: unknown): {
  id?: string
  quote_id?: string
  engine_quote_id?: string
  quote_number?: string | null
  number?: string | null
  deep_link?: string | null
  deep_link_url?: string | null
  url?: string | null
  proposal_view_url?: string | null
  view_url?: string | null
} {
  if (!json || typeof json !== "object") return {}
  return json as Record<string, unknown>
}

export async function createPricingEngineQuote(
  body: CreatePortalQuoteRequest,
): Promise<CreatePortalQuoteSuccess | CreatePortalQuoteFailure> {
  const base = getPricingEngineBaseUrl()
  const key = getPricingEngineApiKey()
  if (!base || !key) {
    return {
      ok: false,
      error:
        "Pricing engine is not configured. Set PRICING_ENGINE_BASE_URL and PRICING_ENGINE_API_KEY on the server.",
    }
  }

  const path = getPricingEngineQuotesPath()
  const url = `${base}${path}`

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": body.idempotency_key,
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    return { ok: false, error: `Network error calling pricing engine: ${String(e)}` }
  }

  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!res.ok) {
    const msg =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error?: unknown }).error ?? text)
        : text || res.statusText
    return { ok: false, error: msg || `HTTP ${res.status}`, status: res.status }
  }

  const o = parseQuoteResponse(json)
  const engineId = o.engine_quote_id ?? o.quote_id ?? o.id
  if (!engineId || typeof engineId !== "string") {
    return {
      ok: false,
      error: "Pricing engine returned success but no quote id in the response.",
      status: res.status,
    }
  }

  const number = o.quote_number ?? o.number ?? null
  const deep =
    o.deep_link_url ?? o.deep_link ?? o.proposal_view_url ?? o.view_url ?? o.url ?? null

  return {
    ok: true,
    engine_quote_id: engineId,
    engine_quote_number: number,
    deep_link_url: deep,
    proposal_view_url: o.proposal_view_url ?? o.view_url ?? null,
  }
}
