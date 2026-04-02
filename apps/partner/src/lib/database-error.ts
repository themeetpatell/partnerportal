const CONNECTION_ERROR_CODES = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
])

const CONNECTION_MESSAGE_PATTERNS = [
  "getaddrinfo enotfound",
  "connect econnrefused",
  "connect etimedout",
  "connection terminated unexpectedly",
  "failed to connect",
  "could not connect to server",
  "server closed the connection unexpectedly",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function collectErrors(error: unknown): Error[] {
  if (error instanceof Error) {
    const causeErrors = "cause" in error ? collectErrors((error as Error & { cause?: unknown }).cause) : []
    return [error, ...causeErrors]
  }

  if (isRecord(error) && "cause" in error) {
    return collectErrors(error.cause)
  }

  return []
}

function collectCodes(error: unknown) {
  const records = [error, ...collectErrors(error)]
  const codes = new Set<string>()

  for (const record of records) {
    if (!isRecord(record)) {
      continue
    }

    const code = record.code
    if (typeof code === "string" && code.trim()) {
      codes.add(code.toUpperCase())
    }
  }

  return [...codes]
}

function collectMessages(error: unknown) {
  const messages = new Set<string>()

  if (typeof error === "string" && error.trim()) {
    messages.add(error)
  }

  for (const err of collectErrors(error)) {
    if (err.message.trim()) {
      messages.add(err.message)
    }
  }

  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) {
    messages.add(error.message)
  }

  return [...messages]
}

export function isDatabaseConnectivityError(error: unknown) {
  const codes = collectCodes(error)
  if (codes.some((code) => CONNECTION_ERROR_CODES.has(code))) {
    return true
  }

  const joinedMessage = collectMessages(error).join(" ").toLowerCase()
  return CONNECTION_MESSAGE_PATTERNS.some((pattern) => joinedMessage.includes(pattern))
}

export function getDatabaseErrorHost(error: unknown) {
  const joinedMessage = collectMessages(error).join(" ")
  const hostMatch = joinedMessage.match(
    /\b(?:ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i
  )

  if (hostMatch?.[1]) {
    return hostMatch[1]
  }

  return null
}
