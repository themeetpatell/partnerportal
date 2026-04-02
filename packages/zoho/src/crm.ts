export interface ZohoLead {
  id?: string
  Last_Name: string
  First_Name?: string
  Full_Name?: string
  Email: string
  Phone?: string
  Company?: string
  Description?: string
  Lead_Source: string
  Lead_Status?: string
  Services_List?: string[]
  Converted_Deal?: { id: string } | null
  Related_Deal?: { id: string } | null
}

export interface ZohoDeal {
  id?: string
  Deal_Name: string
  Stage: string
  Amount?: string | number
  Expected_Revenue?: string | number
  Contact_Name?: { id: string }
}

const ZOHO_BASE_URL =
  process.env.ZOHO_BASE_URL || "https://www.zohoapis.com/crm/v3"
const ZOHO_DEAL_PIPELINE =
  process.env.ZOHO_DEAL_PIPELINE || "General Sales"
const ZOHO_DEAL_QUALIFICATION_STAGE =
  process.env.ZOHO_DEAL_QUALIFICATION_STAGE || "Qualification"
const ZOHO_LEAD_SERVICE_PICKLIST_VALUES = [
  "Corporate Tax Registration",
  "Corporate Tax Filing - Essential",
  "Corporate Tax Filing - Growth",
  "Corporate Tax Filing - Scale",
  "VAT Registration",
  "VAT Filing - 100txn",
  "VAT Filing - 500txn",
  "VAT Filing - 1000txn",
  "Scale Monthly Accounting",
  "Growth Quarterly Accounting",
  "Essential Annual Accounting",
  "Financial Statement Preparation",
  "Auditing",
  "Liquidation",
  "Audited Financial Statements",
  "FTA Amendments",
  "Management Accounting",
  "AML Compliance",
  "Corporate Tax Deregistration",
  "Fractional CFO - hourly",
  "VAT Deregistration",
  "Accounting",
  "Financial Modelling",
  "Salary Benchmarking",
  "Looking for Partnership",
  "CFO Services",
] as const

const zohoLeadServicePicklistMap = new Map(
  ZOHO_LEAD_SERVICE_PICKLIST_VALUES.map((value) => [value.toLowerCase(), value])
)

const zohoLeadServiceAliases = new Map<string, (typeof ZOHO_LEAD_SERVICE_PICKLIST_VALUES)[number]>([
  ["tax registration", "VAT Registration"],
  ["tax registration (vat)", "VAT Registration"],
  ["bookkeeping", "Accounting"],
  ["bookkeeping (monthly)", "Accounting"],
  ["audit & assurance", "Auditing"],
  ["audit services", "Auditing"],
])

export function normalizeZohoLeadServices(serviceInterest: string[] | null | undefined) {
  const normalized = new Set<string>()

  for (const value of serviceInterest ?? []) {
    const trimmed = value.trim()
    if (!trimmed) continue

    const lowercased = trimmed.toLowerCase()
    const directMatch = zohoLeadServicePicklistMap.get(lowercased)
    const aliasedMatch = zohoLeadServiceAliases.get(lowercased)

    if (directMatch) {
      normalized.add(directMatch)
      continue
    }

    if (aliasedMatch) {
      normalized.add(aliasedMatch)
    }
  }

  return [...normalized]
}

// Cache token in memory to avoid unnecessary refreshes
let cachedToken: { token: string; expiresAt: number } | null = null

async function getZohoAccessToken(): Promise<string> {
  const now = Date.now()

  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token
  }

  const clientId = process.env.ZOHO_CLIENT_ID
  const clientSecret = process.env.ZOHO_CLIENT_SECRET
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "[zoho/crm] Missing ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, or ZOHO_REFRESH_TOKEN"
    )
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })

  const res = await fetch(
    `https://accounts.zoho.com/oauth/v2/token?${params.toString()}`,
    { method: "POST" }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[zoho/crm] Token refresh failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }

  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  }

  return cachedToken.token
}

export async function createZohoLead(lead: ZohoLead): Promise<string | null> {
  try {
    const token = await getZohoAccessToken()

    const res = await fetch(`${ZOHO_BASE_URL}/Leads`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: [lead] }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[zoho/crm] createZohoLead failed", { status: res.status, body: text })
      return null
    }

    const data = (await res.json()) as { data: Array<{ details: { id: string } }> }
    return data.data?.[0]?.details?.id ?? null
  } catch (error) {
    console.error("[zoho/crm] createZohoLead error", { error: String(error) })
    return null
  }
}

export async function fetchZohoLead(leadId: string): Promise<ZohoLead | null> {
  try {
    const token = await getZohoAccessToken()

    const res = await fetch(`${ZOHO_BASE_URL}/Leads/${leadId}`, {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[zoho/crm] fetchZohoLead failed", {
        leadId,
        status: res.status,
        body: text,
      })
      return null
    }

    const data = (await res.json()) as { data?: ZohoLead[] }
    return data.data?.[0] ?? null
  } catch (error) {
    console.error("[zoho/crm] fetchZohoLead error", { leadId, error: String(error) })
    return null
  }
}

export async function updateZohoLead(
  leadId: string,
  updates: Partial<ZohoLead>
): Promise<boolean> {
  try {
    const token = await getZohoAccessToken()

    const res = await fetch(`${ZOHO_BASE_URL}/Leads/${leadId}`, {
      method: "PUT",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: [updates] }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[zoho/crm] updateZohoLead failed", {
        leadId,
        status: res.status,
        body: text,
      })
      return false
    }

    return true
  } catch (error) {
    console.error("[zoho/crm] updateZohoLead error", { leadId, error: String(error) })
    return false
  }
}

export async function createZohoDeal(deal: ZohoDeal): Promise<string | null> {
  try {
    const token = await getZohoAccessToken()

    const res = await fetch(`${ZOHO_BASE_URL}/Deals`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: [deal] }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[zoho/crm] createZohoDeal failed", { status: res.status, body: text })
      return null
    }

    const data = (await res.json()) as { data: Array<{ details: { id: string } }> }
    return data.data?.[0]?.details?.id ?? null
  } catch (error) {
    console.error("[zoho/crm] createZohoDeal error", { error: String(error) })
    return null
  }
}

export function getZohoLeadDealId(lead: ZohoLead | null | undefined) {
  return lead?.Converted_Deal?.id ?? lead?.Related_Deal?.id ?? null
}

export async function convertZohoLeadToDeal(params: {
  leadId: string
  dealName: string
  closingDate: string
  leadSource?: string
  pipeline?: string
  stage?: string
}): Promise<string | null> {
  try {
    const token = await getZohoAccessToken()
    const payload = {
      overwrite: false,
      notify_lead_owner: false,
      notify_new_entity_owner: false,
      Deals: {
        Deal_Name: params.dealName,
        Closing_Date: params.closingDate,
        Pipeline: params.pipeline || ZOHO_DEAL_PIPELINE,
        Stage: params.stage || ZOHO_DEAL_QUALIFICATION_STAGE,
        ...(params.leadSource ? { Lead_Source: params.leadSource } : {}),
      },
    }

    const res = await fetch(`${ZOHO_BASE_URL}/Leads/${params.leadId}/actions/convert`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[zoho/crm] convertZohoLeadToDeal failed", {
        leadId: params.leadId,
        status: res.status,
        body: text,
      })
      return null
    }

    const data = (await res.json()) as {
      data?: Array<{
        details?: {
          Deals?: string
          deals?: string
          Converted_Deal?: { id?: string } | null
        }
      }>
    }

    const convertedDealId =
      data.data?.[0]?.details?.Deals ??
      data.data?.[0]?.details?.deals ??
      data.data?.[0]?.details?.Converted_Deal?.id ??
      null

    if (convertedDealId) {
      return convertedDealId
    }

    const refreshedLead = await fetchZohoLead(params.leadId)
    return getZohoLeadDealId(refreshedLead)
  } catch (error) {
    console.error("[zoho/crm] convertZohoLeadToDeal error", {
      leadId: params.leadId,
      error: String(error),
    })
    return null
  }
}

export async function fetchZohoDeal(dealId: string): Promise<ZohoDeal | null> {
  try {
    const token = await getZohoAccessToken()

    const res = await fetch(`${ZOHO_BASE_URL}/Deals/${dealId}`, {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[zoho/crm] fetchZohoDeal failed", {
        dealId,
        status: res.status,
        body: text,
      })
      return null
    }

    const data = (await res.json()) as { data?: ZohoDeal[] }
    return data.data?.[0] ?? null
  } catch (error) {
    console.error("[zoho/crm] fetchZohoDeal error", { dealId, error: String(error) })
    return null
  }
}

export function getZohoDealAmount(deal: ZohoDeal): number {
  const rawAmount = deal.Amount ?? deal.Expected_Revenue ?? 0
  const parsed = typeof rawAmount === "number" ? rawAmount : Number(rawAmount)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export async function updateZohoDealStage(
  dealId: string,
  stage: string
): Promise<boolean> {
  try {
    const token = await getZohoAccessToken()

    const res = await fetch(`${ZOHO_BASE_URL}/Deals/${dealId}`, {
      method: "PUT",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: [{ Stage: stage }] }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[zoho/crm] updateZohoDealStage failed", {
        dealId,
        stage,
        status: res.status,
        body: text,
      })
      return false
    }

    return true
  } catch (error) {
    console.error("[zoho/crm] updateZohoDealStage error", {
      dealId,
      stage,
      error: String(error),
    })
    return false
  }
}

/**
 * Map Zoho deal stage to our lead status
 * Common Zoho CRM deal stages: Qualification, Proposal/Quotation, Negotiation, Closed Won, Closed Lost
 */
export function mapZohoDealStageToLeadStatus(
  zohoStage: string
): "submitted" | "qualified" | "proposal_sent" | "deal_won" | "deal_lost" {
  const stage = zohoStage.toLowerCase().trim()

  if (stage.includes("won")) return "deal_won"
  if (stage.includes("lost")) return "deal_lost"
  if (stage.includes("proposal") || stage.includes("quotation") || stage.includes("price quote")) return "proposal_sent"
  if (stage.includes("qualification") || stage.includes("qualified")) return "qualified"

  return "qualified"
}

export function mapZohoLeadStatusToLeadStatus(
  zohoLeadStatus: string | null | undefined
): "submitted" | "qualified" | "deal_lost" {
  const status = zohoLeadStatus?.toLowerCase().trim() ?? ""

  if (status.includes("qualified")) {
    return "qualified"
  }

  if (
    status.includes("lost") ||
    status.includes("junk") ||
    status.includes("dncr") ||
    status.includes("archive")
  ) {
    return "deal_lost"
  }

  return "submitted"
}
