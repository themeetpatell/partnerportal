import { timingSafeEqual } from "node:crypto"
import { rateLimit } from "@repo/auth"
import { findPartnerByPromoCode } from "@repo/db"
import {
  normalizePartnerPromoCodeInput,
  validatePartnerPromoCodeNormalized,
} from "@repo/types"
import { NextRequest, NextResponse } from "next/server"
import { getRequiredTenantId } from "@/lib/env"

function timingSafeBearerMatch(header: string | null, expected: string): boolean {
  const PREFIX = "Bearer "
  if (!header || !header.startsWith(PREFIX)) return false
  const provided = header.slice(PREFIX.length).trim()
  if (!provided || !expected) return false
  try {
    const a = Buffer.from(provided, "utf8")
    const b = Buffer.from(expected, "utf8")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}

/**
 * Pricing-engine / automation: resolve partner by promo code for a tenant.
 * Auth: Bearer PARTNER_PROMO_LOOKUP_API_KEY (set in admin deployment).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const secret = process.env.PARTNER_PROMO_LOOKUP_API_KEY?.trim()
  if (!secret) {
    return NextResponse.json(
      { error: "Partner promo lookup is not configured on this deployment." },
      { status: 503 },
    )
  }

  const authz = request.headers.get("authorization")
  if (!timingSafeBearerMatch(authz, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const ip = clientIp(request)
  const limitedKey = `partner-promo-lookup:${ip}`
  const limited = rateLimit(limitedKey, 300, 60_000)
  if (limited) return limited

  const { code: rawCode } = await params
  const decoded =
    typeof rawCode === "string" ? decodeURIComponent(rawCode) : String(rawCode ?? "")
  const normalized = normalizePartnerPromoCodeInput(decoded)
  const chk = validatePartnerPromoCodeNormalized(normalized)
  if (!chk.ok) {
    return NextResponse.json({ valid: false as const, error: chk.error }, { status: 400 })
  }

  const tenantId =
    request.nextUrl.searchParams.get("tenantId")?.trim() || getRequiredTenantId()

  let partner
  try {
    partner = await findPartnerByPromoCode(tenantId, normalized)
  } catch {
    return NextResponse.json({ valid: false as const, error: "Lookup failed." }, { status: 500 })
  }

  if (!partner) {
    return NextResponse.json(
      { valid: false as const, error: "No partner found for this promo code." },
      { status: 404 },
    )
  }

  return NextResponse.json({
    valid: true as const,
    partnerId: partner.partnerId,
    tenantId: partner.tenantId,
    promoCode: normalized,
    companyName: partner.companyName,
    partnerStatus: partner.status,
    /** Only approved partners should receive quote attribution in the pricing engine. */
    attributionEligible: partner.status === "approved",
  })
}
