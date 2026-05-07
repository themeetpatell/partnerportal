import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Hex HMAC-SHA256 of rawBody using shared secret.
 * Send as: `X-Pricing-Engine-Signature: sha256=<hex>`
 */
export function signPricingEngineWebhookBody(secret: string, rawBody: string): string {
  const h = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
  return `sha256=${h}`
}

export function verifyPricingEngineWebhookSignature(
  secret: string,
  rawBody: string,
  headerValue: string | null,
): boolean {
  if (!headerValue?.trim()) return false
  const expected = signPricingEngineWebhookBody(secret, rawBody)
  const recv = headerValue.trim()
  try {
    const a = Buffer.from(expected, "utf8")
    const b = Buffer.from(recv, "utf8")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
