const ZOHO_SIGN_BASE_URL =
  process.env.ZOHO_SIGN_BASE_URL || "https://sign.zoho.com/api/v1"
const ZOHO_ACCOUNTS_BASE_URL =
  process.env.ZOHO_ACCOUNTS_BASE_URL || "https://accounts.zoho.com"
const ZOHO_SIGN_CLIENT_ID =
  process.env.ZOHO_SIGN_CLIENT_ID || process.env.ZOHO_CLIENT_ID
const ZOHO_SIGN_CLIENT_SECRET =
  process.env.ZOHO_SIGN_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET
const ZOHO_SIGN_REFRESH_TOKEN =
  process.env.ZOHO_SIGN_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN

type ZohoSignAction = {
  action_id: string
  recipient_name?: string
  recipient_email?: string
  action_type?: string
  action_status?: string
  signing_order?: number
  private_notes?: string
  verify_recipient?: boolean
  verification_type?: string
  is_embedded?: boolean
  fields?: Array<Record<string, unknown>>
  action_completed_time?: number | string | null
  completed_time?: number | string | null
}

type ZohoSignDocument = {
  document_id: string
  document_name?: string
  total_pages?: number
}

type ZohoSignRequest = {
  request_id: string
  request_name?: string
  request_status?: string
  actions?: ZohoSignAction[]
  document_ids?: ZohoSignDocument[]
}

function bufferToPdfBlob(buffer: Buffer) {
  const bytes = new Uint8Array(buffer)
  return new Blob([bytes], { type: "application/pdf" })
}

async function getZohoSignAccessToken() {
  if (!ZOHO_SIGN_CLIENT_ID || !ZOHO_SIGN_CLIENT_SECRET || !ZOHO_SIGN_REFRESH_TOKEN) {
    throw new Error(
      "[zoho/sign] Missing ZOHO_SIGN_CLIENT_ID, ZOHO_SIGN_CLIENT_SECRET, or ZOHO_SIGN_REFRESH_TOKEN"
    )
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: ZOHO_SIGN_CLIENT_ID,
    client_secret: ZOHO_SIGN_CLIENT_SECRET,
    refresh_token: ZOHO_SIGN_REFRESH_TOKEN,
  })

  const res = await fetch(
    `${ZOHO_ACCOUNTS_BASE_URL}/oauth/v2/token?${params.toString()}`,
    { method: "POST" }
  )

  if (!res.ok) {
    throw new Error(`[zoho/sign] token refresh failed: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) {
    throw new Error("[zoho/sign] token refresh succeeded without access_token")
  }

  return data.access_token
}

async function zohoSignJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getZohoSignAccessToken()
  const res = await fetch(`${ZOHO_SIGN_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      ...(init?.headers || {}),
    },
  })

  if (!res.ok) {
    throw new Error(`[zoho/sign] ${path} failed: ${res.status} ${await res.text()}`)
  }

  return (await res.json()) as T
}

async function zohoSignBinary(path: string): Promise<Buffer> {
  const token = await getZohoSignAccessToken()
  const res = await fetch(`${ZOHO_SIGN_BASE_URL}${path}`, {
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
    },
  })

  if (!res.ok) {
    throw new Error(`[zoho/sign] ${path} failed: ${res.status} ${await res.text()}`)
  }

  return Buffer.from(await res.arrayBuffer())
}

export async function createZohoSignRequest(params: {
  requestName: string
  description?: string
  recipientName: string
  recipientEmail: string
  fileName: string
  fileBytes: Buffer
  notes?: string
  expirationDays?: number
  reminderPeriod?: number
  redirectPages?: Partial<Record<"sign_success" | "sign_completed" | "sign_declined" | "sign_later", string>>
}) {
  const token = await getZohoSignAccessToken()
  const formData = new FormData()
  const payload = {
    requests: {
      request_name: params.requestName,
      description: params.description || "",
      is_sequential: true,
      expiration_days: params.expirationDays ?? 14,
      email_reminders: true,
      reminder_period: params.reminderPeriod ?? 3,
      notes: params.notes || "",
      redirect_pages: params.redirectPages || undefined,
      actions: [
        {
          action_type: "SIGN",
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          signing_order: 0,
          verify_recipient: true,
          verification_type: "EMAIL",
          private_notes: params.notes || "",
          is_embedded: true,
        },
      ],
    },
  }

  formData.append("data", JSON.stringify(payload))
  formData.append("file", bufferToPdfBlob(params.fileBytes), params.fileName)

  const res = await fetch(`${ZOHO_SIGN_BASE_URL}/requests`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`[zoho/sign] create request failed: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as {
    requests?: ZohoSignRequest
    status?: string
    message?: string
  }

  if (!data.requests?.request_id) {
    throw new Error(`[zoho/sign] create request returned no request_id: ${JSON.stringify(data)}`)
  }

  return data.requests
}

export async function submitZohoSignRequest(params: {
  requestId: string
  actionId: string
  recipientName: string
  recipientEmail: string
  documentId: string
  pageNo: number
  xCoord: number
  yCoord: number
  width: number
  height: number
}) {
  const payload = {
    requests: {
      actions: [
        {
          action_id: params.actionId,
          recipient_name: params.recipientName,
          recipient_email: params.recipientEmail,
          action_type: "SIGN",
          fields: [
            {
              document_id: params.documentId,
              field_name: "Signature",
              field_label: "Signature",
              field_type_name: "Signature",
              field_category: "image",
              page_no: params.pageNo,
              x_coord: params.xCoord,
              y_coord: params.yCoord,
              abs_width: params.width,
              abs_height: params.height,
              is_mandatory: true,
            },
            {
              document_id: params.documentId,
              field_name: "Sign Date",
              field_label: "Sign Date",
              field_type_name: "Date",
              field_category: "datefield",
              page_no: params.pageNo,
              x_coord: params.xCoord,
              y_coord: params.yCoord + params.height + 18,
              abs_width: params.width,
              abs_height: 24,
              is_mandatory: true,
            },
          ],
        },
      ],
    },
  }

  return zohoSignJson<{
    requests?: ZohoSignRequest
    status?: string
    message?: string
  }>(`/requests/${params.requestId}/submit`, {
    method: "POST",
    body: new URLSearchParams({
      data: JSON.stringify(payload),
    }),
  })
}

export async function getZohoSignRequest(requestId: string) {
  const data = await zohoSignJson<{
    requests?: ZohoSignRequest
    status?: string
    message?: string
  }>(`/requests/${requestId}`)

  if (!data.requests?.request_id) {
    throw new Error(`[zoho/sign] request lookup returned no request: ${JSON.stringify(data)}`)
  }

  return data.requests
}

export async function createZohoSignEmbedUrl(params: {
  requestId: string
  actionId: string
  host: string
}) {
  const token = await getZohoSignAccessToken()
  const formData = new FormData()
  formData.append("host", params.host)

  const res = await fetch(
    `${ZOHO_SIGN_BASE_URL}/requests/${params.requestId}/actions/${params.actionId}/embedtoken`,
    {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
      },
      body: formData,
    }
  )

  if (!res.ok) {
    throw new Error(`[zoho/sign] embed token failed: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as {
    sign_url?: string
    status?: string
    message?: string
  }

  if (!data.sign_url) {
    throw new Error(`[zoho/sign] embed token returned no sign_url: ${JSON.stringify(data)}`)
  }

  return data.sign_url
}

export async function downloadZohoSignRequestPdf(requestId: string) {
  return zohoSignBinary(`/requests/${requestId}/pdf`)
}

export async function downloadZohoSignCompletionCertificate(requestId: string) {
  return zohoSignBinary(`/requests/${requestId}/completioncertificate`)
}
