export interface ZohoLead {
  id?: string
  Last_Name: string
  First_Name?: string
  Email: string
  Phone?: string
  Company?: string
  Description?: string
  Lead_Source: string
}

export interface ZohoDeal {
  id?: string
  Deal_Name: string
  Stage: string
  Contact_Name?: { id: string }
}

const ZOHO_BASE_URL =
  process.env.ZOHO_BASE_URL || "https://www.zohoapis.com/crm/v3"

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

    const data = (await res.json()) as { data: ZohoDeal }
    return data.data || null
  } catch (error) {
    console.error("[zoho/crm] fetchZohoDeal error", { dealId, error: String(error) })
    return null
  }
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
  if (stage.includes("proposal") || stage.includes("quotation")) return "proposal_sent"
  if (stage.includes("qualification") || stage.includes("qualified")) return "qualified"

  // Default to proposal_sent for any other stage
  return "proposal_sent"
}
