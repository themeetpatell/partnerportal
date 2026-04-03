type SavedClientInput = {
  id: string
  companyName: string
  contactName: string
  email: string | null
  phone: string | null
  nationality: string | null
  tradeLicenseNumber: string | null
  city: string | null
  country: string | null
  status: string
  renewalDate: Date | null
  notes: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

type LeadClientInput = {
  customerName: string
  customerEmail: string
  customerCompany: string | null
  status: string
  createdAt: Date | null
}

type RequestClientInput = {
  customerCompany: string
  customerContact: string
  customerEmail: string
  serviceName: string
  status: string
  createdAt: Date | null
}

export type ClientRecord = {
  key: string
  clientId: string | null
  source: "saved" | "activity_only"
  displayName: string
  contactName: string | null
  email: string | null
  phone: string | null
  nationality: string | null
  tradeLicenseNumber: string | null
  city: string | null
  country: string | null
  status: string | null
  renewalDate: Date | null
  renewalState: "not_set" | "upcoming" | "due_soon" | "overdue"
  notes: string | null
  leadCount: number
  requestCount: number
  hasOpenLead: boolean
  hasActiveRequest: boolean
  latestLeadStatus: string | null
  latestRequestStatus: string | null
  latestServiceName: string | null
  lastActivity: Date | null
}

export function normalizeClientValue(value: string | null | undefined) {
  return value?.trim() || null
}

export function buildClientKey(
  email: string | null | undefined,
  company: string | null | undefined,
  fallback: string | null | undefined
) {
  return (
    normalizeClientValue(email)?.toLowerCase() ||
    normalizeClientValue(company)?.toLowerCase() ||
    normalizeClientValue(fallback)?.toLowerCase() ||
    "unknown-client"
  )
}

function maxDate(current: Date | null, candidate: Date | null) {
  if (!current) {
    return candidate
  }

  if (!candidate) {
    return current
  }

  return candidate > current ? candidate : current
}

function getRenewalState(renewalDate: Date | null) {
  if (!renewalDate) {
    return "not_set" as const
  }

  const today = new Date()
  const diffDays = Math.floor(
    (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays < 0) {
    return "overdue" as const
  }

  if (diffDays <= 30) {
    return "due_soon" as const
  }

  return "upcoming" as const
}

export function buildClientRecords(
  savedClientRows: SavedClientInput[],
  leadRows: LeadClientInput[],
  requestRows: RequestClientInput[]
) {
  const clientMap = new Map<
    string,
    ClientRecord & {
      latestLeadAt: Date | null
      latestRequestAt: Date | null
    }
  >()

  for (const client of savedClientRows) {
    const key = buildClientKey(client.email, client.companyName, client.contactName)
    clientMap.set(key, {
      key,
      clientId: client.id,
      source: "saved",
      displayName: normalizeClientValue(client.companyName) || "Unnamed client",
      contactName: normalizeClientValue(client.contactName),
      email: normalizeClientValue(client.email),
      phone: normalizeClientValue(client.phone),
      nationality: normalizeClientValue(client.nationality),
      tradeLicenseNumber: normalizeClientValue(client.tradeLicenseNumber),
      city: normalizeClientValue(client.city),
      country: normalizeClientValue(client.country),
      status: client.status,
      renewalDate: client.renewalDate,
      renewalState: getRenewalState(client.renewalDate),
      notes: client.notes,
      leadCount: 0,
      requestCount: 0,
      hasOpenLead: false,
      hasActiveRequest: false,
      latestLeadStatus: null,
      latestRequestStatus: null,
      latestServiceName: null,
      lastActivity: maxDate(client.updatedAt, client.createdAt),
      latestLeadAt: null,
      latestRequestAt: null,
    })
  }

  for (const lead of leadRows) {
    const key = buildClientKey(
      lead.customerEmail,
      lead.customerCompany,
      lead.customerName
    )
    const existing = clientMap.get(key) ?? {
      key,
      clientId: null,
      source: "activity_only" as const,
      displayName:
        normalizeClientValue(lead.customerCompany) ||
        normalizeClientValue(lead.customerName) ||
        normalizeClientValue(lead.customerEmail) ||
        "Unnamed client",
      contactName: normalizeClientValue(lead.customerName),
      email: normalizeClientValue(lead.customerEmail),
      phone: null,
      nationality: null,
      tradeLicenseNumber: null,
      city: null,
      country: null,
      status: null,
      renewalDate: null,
      renewalState: "not_set" as const,
      notes: null,
      leadCount: 0,
      requestCount: 0,
      hasOpenLead: false,
      hasActiveRequest: false,
      latestLeadStatus: null,
      latestRequestStatus: null,
      latestServiceName: null,
      lastActivity: null,
      latestLeadAt: null,
      latestRequestAt: null,
    }

    existing.displayName =
      existing.displayName ||
      normalizeClientValue(lead.customerCompany) ||
      normalizeClientValue(lead.customerName) ||
      normalizeClientValue(lead.customerEmail) ||
      "Unnamed client"
    existing.contactName = existing.contactName || normalizeClientValue(lead.customerName)
    existing.email = existing.email || normalizeClientValue(lead.customerEmail)
    existing.leadCount += 1
    existing.hasOpenLead =
      existing.hasOpenLead || !["deal_won", "deal_lost"].includes(lead.status)
    existing.lastActivity = maxDate(existing.lastActivity, lead.createdAt)

    if (
      !existing.latestLeadAt ||
      (lead.createdAt && lead.createdAt > existing.latestLeadAt)
    ) {
      existing.latestLeadAt = lead.createdAt
      existing.latestLeadStatus = lead.status
    }

    clientMap.set(key, existing)
  }

  for (const request of requestRows) {
    const key = buildClientKey(
      request.customerEmail,
      request.customerCompany,
      request.customerContact
    )
    const existing = clientMap.get(key) ?? {
      key,
      clientId: null,
      source: "activity_only" as const,
      displayName:
        normalizeClientValue(request.customerCompany) ||
        normalizeClientValue(request.customerContact) ||
        normalizeClientValue(request.customerEmail) ||
        "Unnamed client",
      contactName: normalizeClientValue(request.customerContact),
      email: normalizeClientValue(request.customerEmail),
      phone: null,
      nationality: null,
      tradeLicenseNumber: null,
      city: null,
      country: null,
      status: null,
      renewalDate: null,
      renewalState: "not_set" as const,
      notes: null,
      leadCount: 0,
      requestCount: 0,
      hasOpenLead: false,
      hasActiveRequest: false,
      latestLeadStatus: null,
      latestRequestStatus: null,
      latestServiceName: null,
      lastActivity: null,
      latestLeadAt: null,
      latestRequestAt: null,
    }

    existing.displayName =
      existing.displayName ||
      normalizeClientValue(request.customerCompany) ||
      normalizeClientValue(request.customerContact) ||
      normalizeClientValue(request.customerEmail) ||
      "Unnamed client"
    existing.contactName =
      existing.contactName || normalizeClientValue(request.customerContact)
    existing.email = existing.email || normalizeClientValue(request.customerEmail)
    existing.requestCount += 1
    existing.hasActiveRequest =
      existing.hasActiveRequest ||
      !["completed", "cancelled"].includes(request.status)
    existing.lastActivity = maxDate(existing.lastActivity, request.createdAt)

    if (
      !existing.latestRequestAt ||
      (request.createdAt && request.createdAt > existing.latestRequestAt)
    ) {
      existing.latestRequestAt = request.createdAt
      existing.latestRequestStatus = request.status
      existing.latestServiceName = request.serviceName
    }

    clientMap.set(key, existing)
  }

  return [...clientMap.values()]
    .sort((a, b) => {
      const aSavedRank = a.source === "saved" ? 0 : 1
      const bSavedRank = b.source === "saved" ? 0 : 1
      const aTime = a.lastActivity?.getTime() ?? 0
      const bTime = b.lastActivity?.getTime() ?? 0

      return (
        aSavedRank - bSavedRank ||
        bTime - aTime ||
        a.displayName.localeCompare(b.displayName)
      )
    })
    .map((client) => {
      const { latestLeadAt, latestRequestAt, ...rest } = client
      void latestLeadAt
      void latestRequestAt
      return rest
    })
}
