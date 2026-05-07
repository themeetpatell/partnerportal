import {
  PRICING_ENGINE_SIGNATURE_HEADER,
  PricingEngineWebhookPayloadSchema,
  getPricingEngineWebhookSecret,
  verifyPricingEngineWebhookSignature,
} from "@repo/pricing-integration"
import { rateLimit } from "@repo/auth"
import { NextRequest, NextResponse } from "next/server"
import { processPricingEngineWebhook } from "@/lib/pricing-engine-webhook-processor"

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}

/**
 * Replit / pricing engine → Partner Portal.
 * Security: raw body HMAC (see @repo/pricing-integration signPricingEngineWebhookBody).
 */
export async function POST(request: NextRequest) {
  const secret = getPricingEngineWebhookSecret()
  if (!secret) {
    return NextResponse.json(
      { error: "PRICING_ENGINE_WEBHOOK_SECRET is not configured." },
      { status: 503 },
    )
  }

  const ip = clientIp(request)
  const limited = rateLimit(`pricing-engine-webhook:${ip}`, 800, 60_000)
  if (limited) return limited

  const rawBody = await request.text()
  const sig = request.headers.get(PRICING_ENGINE_SIGNATURE_HEADER)
  if (!verifyPricingEngineWebhookSignature(secret, rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let json: unknown
  try {
    json = rawBody ? JSON.parse(rawBody) : null
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = PricingEngineWebhookPayloadSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const result = await processPricingEngineWebhook(parsed.data)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true, duplicate: Boolean(result.duplicate) })
}
