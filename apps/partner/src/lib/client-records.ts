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
  displayName: string
  contactName: string | null
  email: string | null
  leadCount: number
  requestCount: number
  hasOpenLead: boolean
  hasActiveRequest: boolean
  latestLeadStatus: string | null
  latestRequestStatus: string | null
  latestServiceName: string | null
  lastActivity: Date | null
}

function normalize(value: string | null | undefined) {
  return value?.trim() || null
}

function buildClientKey(
  email: string | null | undefined,
  company: string | null | undefined,
  fallback: string | null | undefined,
) {
  return (
    normalize(email)?.toLowerCase() ||
    normalize(company)?.toLowerCase() ||
    normalize(fallback)?.toLowerCase() ||
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

export function buildClientRecords(
  leadRows: LeadClientInput[],
  requestRows: RequestClientInput[],
) {
  const clientMap = new Map<
    string,
    ClientRecord & {
      latestLeadAt: Date | null
      latestRequestAt: Date | null
    }
  >()

  for (const lead of leadRows) {
    const key = buildClientKey(
      lead.customerEmail,
      lead.customerCompany,
      lead.customerName,
    )
    const existing = clientMap.get(key) ?? {
      key,
      displayName:
        normalize(lead.customerCompany) ||
        normalize(lead.customerName) ||
        normalize(lead.customerEmail) ||
        "Unnamed client",
      contactName: normalize(lead.customerName),
      email: normalize(lead.customerEmail),
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
      normalize(lead.customerCompany) ||
      normalize(lead.customerName) ||
      normalize(lead.customerEmail) ||
      "Unnamed client"
    existing.contactName = existing.contactName || normalize(lead.customerName)
    existing.email = existing.email || normalize(lead.customerEmail)
    existing.leadCount += 1
    existing.hasOpenLead =
      existing.hasOpenLead || !["converted", "rejected"].includes(lead.status)
    existing.lastActivity = maxDate(existing.lastActivity, lead.createdAt)

    if (!existing.latestLeadAt || (lead.createdAt && lead.createdAt > existing.latestLeadAt)) {
      existing.latestLeadAt = lead.createdAt
      existing.latestLeadStatus = lead.status
    }

    clientMap.set(key, existing)
  }

  for (const request of requestRows) {
    const key = buildClientKey(
      request.customerEmail,
      request.customerCompany,
      request.customerContact,
    )
    const existing = clientMap.get(key) ?? {
      key,
      displayName:
        normalize(request.customerCompany) ||
        normalize(request.customerContact) ||
        normalize(request.customerEmail) ||
        "Unnamed client",
      contactName: normalize(request.customerContact),
      email: normalize(request.customerEmail),
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
      normalize(request.customerCompany) ||
      normalize(request.customerContact) ||
      normalize(request.customerEmail) ||
      "Unnamed client"
    existing.contactName = existing.contactName || normalize(request.customerContact)
    existing.email = existing.email || normalize(request.customerEmail)
    existing.requestCount += 1
    existing.hasActiveRequest =
      existing.hasActiveRequest || !["completed", "cancelled"].includes(request.status)
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
      const aTime = a.lastActivity?.getTime() ?? 0
      const bTime = b.lastActivity?.getTime() ?? 0
      return bTime - aTime || a.displayName.localeCompare(b.displayName)
    })
    .map((client) => {
      const { latestLeadAt, latestRequestAt, ...rest } = client
      void latestLeadAt
      void latestRequestAt
      return rest
    })
}
