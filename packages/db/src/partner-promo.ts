import { randomInt } from "node:crypto"
import { and, eq, isNull, ne, sql } from "drizzle-orm"
import { db } from "./client"
import { partners } from "./schema/partners"
import {
  PARTNER_PROMO_CODE_SYMBOLS,
  validatePartnerPromoCodeNormalized,
} from "@repo/types"

const SYMBOL_COUNT = PARTNER_PROMO_CODE_SYMBOLS.length
const DEFAULT_LENGTH = 6
const ALLOC_ATTEMPTS = 48

export function generateRandomPartnerPromoCode(length = DEFAULT_LENGTH): string {
  if (length < 3 || length > 6) {
    throw new RangeError("Partner promo length must be 3–6.")
  }
  let out = ""
  for (let i = 0; i < length; i++) {
    out += PARTNER_PROMO_CODE_SYMBOLS[randomInt(0, SYMBOL_COUNT)]!
  }
  return out
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  )
}

/**
 * Ensures an approved-style partner row has `promo_code`. Idempotent when already set.
 */
export async function ensurePartnerPromoCode(partnerId: string): Promise<string | null> {
  const [existing] = await db
    .select({ promoCode: partners.promoCode })
    .from(partners)
    .where(and(eq(partners.id, partnerId), isNull(partners.deletedAt)))
    .limit(1)

  if (!existing) return null
  if (existing.promoCode) return existing.promoCode

  for (let attempt = 0; attempt < ALLOC_ATTEMPTS; attempt++) {
    const candidate = generateRandomPartnerPromoCode()
    const chk = validatePartnerPromoCodeNormalized(candidate)
    if (!chk.ok) continue

    try {
      const [row] = await db
        .update(partners)
        .set({ promoCode: candidate, updatedAt: new Date() })
        .where(
          and(
            eq(partners.id, partnerId),
            isNull(partners.deletedAt),
            isNull(partners.promoCode),
          ),
        )
        .returning({ promoCode: partners.promoCode })

      if (row?.promoCode) {
        return row.promoCode
      }

      const [again] = await db
        .select({ promoCode: partners.promoCode })
        .from(partners)
        .where(eq(partners.id, partnerId))
        .limit(1)
      return again?.promoCode ?? null
    } catch (e) {
      if (isPostgresUniqueViolation(e)) {
        continue
      }
      throw e
    }
  }

  throw new Error(`Failed to assign partner promo code after ${ALLOC_ATTEMPTS} attempts.`)
}

export type PartnerPromoLookupRow = {
  partnerId: string
  tenantId: string
  status: string
  companyName: string
}

export async function findPartnerByPromoCode(
  tenantId: string,
  normalizedPromoUpper: string,
): Promise<PartnerPromoLookupRow | null> {
  const [row] = await db
    .select({
      partnerId: partners.id,
      tenantId: partners.tenantId,
      status: partners.status,
      companyName: partners.companyName,
    })
    .from(partners)
    .where(
      and(
        eq(partners.tenantId, tenantId),
        isNull(partners.deletedAt),
        sql`upper(${partners.promoCode}) = ${normalizedPromoUpper}`,
      ),
    )
    .limit(1)

  return row ?? null
}

/** Returns duplicate partner id if `code` already exists for tenant (excluding `excludePartnerId`). */
export async function findPartnerPromoCodeConflict(params: {
  tenantId: string
  normalizedCode: string
  excludePartnerId: string
}): Promise<{ conflictingPartnerId: string } | null> {
  const [row] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(
      and(
        eq(partners.tenantId, params.tenantId),
        isNull(partners.deletedAt),
        ne(partners.id, params.excludePartnerId),
        sql`upper(${partners.promoCode}) = ${params.normalizedCode}`,
      ),
    )
    .limit(1)

  return row ? { conflictingPartnerId: row.id } : null
}
