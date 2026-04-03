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
  Industry?: string
  [key: string]: unknown
}

export interface ZohoDeal {
  id?: string
  Deal_Name: string
  Stage: string
  Amount?: string | number
  Expected_Revenue?: string | number
  Closing_Date?: string
  Industry?: string
  Contact_Name?: { id: string }
  [key: string]: unknown
}

const ZOHO_BASE_URL =
  process.env.ZOHO_BASE_URL || "https://www.zohoapis.com/crm/v3"
const ZOHO_ACCOUNTS_BASE_URL =
  process.env.ZOHO_ACCOUNTS_BASE_URL || "https://accounts.zoho.com"
const ZOHO_DEAL_PIPELINE =
  process.env.ZOHO_DEAL_PIPELINE || "General Sales"
const ZOHO_DEAL_QUALIFICATION_STAGE =
  process.env.ZOHO_DEAL_QUALIFICATION_STAGE || "Qualification"
export const ZOHO_LEAD_SERVICE_PICKLIST_VALUES = [
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

function extractPicklistValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return []
    }

    const record = item as Record<string, unknown>
    const candidate =
      (typeof record.actual_value === "string" && record.actual_value.trim()) ||
      (typeof record.display_value === "string" && record.display_value.trim()) ||
      (typeof record.reference_value === "string" && record.reference_value.trim()) ||
      (typeof record.value === "string" && record.value.trim()) ||
      (typeof record.name === "string" && record.name.trim())

    return candidate ? [candidate] : []
  })
}

export async function fetchZohoLeadServiceOptions(): Promise<string[]> {
  try {
    const token = await getZohoAccessToken()

    const res = await fetch(`${ZOHO_BASE_URL}/settings/fields?module=Leads`, {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[zoho/crm] fetchZohoLeadServiceOptions failed", {
        status: res.status,
        body: text,
      })
      return []
    }

    const data = (await res.json()) as {
      fields?: Array<Record<string, unknown>>
    }

    const fields = data.fields ?? []
    const field = fields.find((candidate) => {
      const apiName = typeof candidate.api_name === "string" ? candidate.api_name : ""
      const fieldLabel = typeof candidate.field_label === "string" ? candidate.field_label : ""

      return [
        "Services_List",
        "List_of_Services",
        "Service_List",
        "Services",
      ].includes(apiName) || [
        "services list",
        "list of services",
        "service list",
        "services",
      ].includes(fieldLabel.trim().toLowerCase())
    })

    const values = extractPicklistValues(field?.pick_list_values)
    return [...new Set(values)]
  } catch (error) {
    console.error("[zoho/crm] fetchZohoLeadServiceOptions error", {
      error: String(error),
    })
    return []
  }
}

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

function getFirstDefinedField(
  record: Record<string, unknown> | null | undefined,
  fieldNames: string[],
) {
  if (!record) {
    return null
  }

  for (const fieldName of fieldNames) {
    const value = record[fieldName]
    if (value !== undefined && value !== null && value !== "") {
      return value
    }
  }

  return null
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function getFirstMatchingNormalizedField(
  record: Record<string, unknown> | null | undefined,
  normalizedFieldNames: string[],
) {
  if (!record) {
    return null
  }

  const targetNames = new Set(normalizedFieldNames.map(normalizeFieldName))

  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") {
      continue
    }

    if (targetNames.has(normalizeFieldName(key))) {
      return value
    }
  }

  return null
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") {
          const trimmed = item.trim()
          return trimmed ? [trimmed] : []
        }

        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>
          const nestedListOfServices = record.List_of_Services

          if (nestedListOfServices && typeof nestedListOfServices === "object") {
            const nestedName = (nestedListOfServices as Record<string, unknown>).name
            if (typeof nestedName === "string" && nestedName.trim()) {
              return [nestedName.trim()]
            }
          }

          const directName = record.name
          if (typeof directName === "string" && directName.trim()) {
            return [directName.trim()]
          }
        }

        return []
      })
      .filter(Boolean)
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function toOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function toOptionalNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim()
    if (!normalized) {
      return null
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function getZohoDealServicesList(deal: ZohoDeal | null | undefined) {
  return toStringArray(
    getFirstDefinedField(deal, [
      "List_of_Services",
      "Services_List",
      "Service_List",
      "Services",
    ]) ??
      getFirstMatchingNormalizedField(deal, [
        "List_of_Services",
        "List_of_Service",
        "Services_List",
        "Service_List",
      ]),
  )
}

export function getZohoDealProposal(deal: ZohoDeal | null | undefined) {
  const value =
    getFirstDefinedField(deal, [
      "Proposal",
      "Proposal_Name",
      "Proposal_Number",
      "Proposal_Link",
      "Proposal_URL",
    ]) ??
    getFirstMatchingNormalizedField(deal, [
      "Proposal",
      "Proposal_Name",
      "Proposal_Number",
      "Proposal_Link",
      "Proposal_URL",
    ])

  return toOptionalString(value)
}

export function getZohoDealClosingDate(deal: ZohoDeal | null | undefined) {
  const value =
    getFirstDefinedField(deal, ["Closing_Date", "Expected_Closing_Date"]) ??
    getFirstMatchingNormalizedField(deal, ["Closing_Date", "Expected_Closing_Date"])
  return toOptionalString(value)
}

export function getZohoDealArAmount(deal: ZohoDeal | null | undefined) {
  return toOptionalNumber(
    getFirstDefinedField(deal, [
      "ARR_Amount",
      "AR_Amount",
      "A_R_Amount",
      "AR_Amount_AED",
      "AR_Amount_in_AED",
      "Budget_AED",
    ]) ??
      getFirstMatchingNormalizedField(deal, [
        "ARR_Amount",
        "AR_Amount",
        "A_R_Amount",
        "AR_Amount_AED",
        "AR_Amount_in_AED",
        "Budget_AED",
      ]),
  )
}

export function getZohoDealIndustry(
  deal: ZohoDeal | null | undefined,
  lead?: ZohoLead | null | undefined,
) {
  const value =
    getFirstDefinedField(deal, ["Industry"]) ??
    getFirstDefinedField(deal, ["Pick_List_2"]) ??
    getFirstMatchingNormalizedField(deal, ["Industry", "Pick_List_2"]) ??
    getFirstDefinedField(lead, ["Industry"]) ??
    getFirstMatchingNormalizedField(lead, ["Industry"])
  return toOptionalString(value)
}

export function getZohoDealPaymentId(deal: ZohoDeal | null | undefined) {
  const value =
    getFirstDefinedField(deal, ["Payment_ID", "Payment_Id"]) ??
    getFirstMatchingNormalizedField(deal, ["Payment_ID", "Payment_Id"])
  return toOptionalString(value)
}

export function getZohoDealPaymentStatus(deal: ZohoDeal | null | undefined) {
  const value =
    getFirstDefinedField(deal, ["Payment_Status"]) ??
    getFirstMatchingNormalizedField(deal, ["Payment_Status"])
  return toOptionalString(value)
}

export function getZohoDealPaymentRecurring(deal: ZohoDeal | null | undefined) {
  const value =
    getFirstDefinedField(deal, ["Payment_Recurring"]) ??
    getFirstMatchingNormalizedField(deal, ["Payment_Recurring"])
  return toOptionalString(value)
}

export function getZohoDealCompanyName(
  deal: ZohoDeal | null | undefined,
  lead?: ZohoLead | null | undefined,
) {
  const value =
    getFirstDefinedField(deal, ["Company_Name", "Company"]) ??
    getFirstMatchingNormalizedField(deal, ["Company_Name", "Company"]) ??
    getFirstDefinedField(lead, ["Company"]) ??
    getFirstMatchingNormalizedField(lead, ["Company"])
  return toOptionalString(value)
}

export function getZohoDealServicePeriodStart(deal: ZohoDeal | null | undefined) {
  const value =
    getFirstDefinedField(deal, [
      "Service_Period_Start_From",
      "Payment_Period_Start_From",
      "Service_Start_Date",
      "Service_Period_Start",
    ]) ??
    getFirstMatchingNormalizedField(deal, [
      "Service_Period_Start_From",
      "Payment_Period_Start_From",
      "Service_Start_Date",
      "Service_Period_Start",
    ])
  return toOptionalString(value)
}

export function getZohoDealServicePeriodEnd(deal: ZohoDeal | null | undefined) {
  const value =
    getFirstDefinedField(deal, [
      "Service_Period_Ends_On",
      "Payment_Period_Ends_On",
      "Service_End_Date",
      "Service_Period_End",
    ]) ??
    getFirstMatchingNormalizedField(deal, [
      "Service_Period_Ends_On",
      "Payment_Period_Ends_On",
      "Service_End_Date",
      "Service_Period_End",
    ])
  return toOptionalString(value)
}

export function getZohoDealPaymentMethod(deal: ZohoDeal | null | undefined) {
  const value =
    getFirstDefinedField(deal, ["Payment_Method"]) ??
    getFirstMatchingNormalizedField(deal, ["Payment_Method"])
  return toOptionalString(value)
}

export function getZohoDealServiceType(deal: ZohoDeal | null | undefined) {
  const value =
    getFirstDefinedField(deal, ["Service_Type"]) ??
    getFirstMatchingNormalizedField(deal, ["Service_Type"])
  return toOptionalString(value)
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
    `${ZOHO_ACCOUNTS_BASE_URL}/oauth/v2/token?${params.toString()}`,
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
