import { rateLimit } from "@repo/auth"
import { auth } from "@repo/auth/server"
import { db, ensurePartnerPromoCode, partners } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"

/** Partner self-service: assign a promo code if approved and missing (legacy migrations). */
export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`partner:claim-promo:${userId}`, 10, 60_000)
  if (limited) return limited

  const [partner] = await db
    .select({
      id: partners.id,
      status: partners.status,
      promoCode: partners.promoCode,
    })
    .from(partners)
    .where(and(eq(partners.authUserId, userId), isNull(partners.deletedAt)))
    .limit(1)

  if (!partner) {
    return NextResponse.json({ error: "Partner account not found." }, { status: 404 })
  }

  if (partner.status !== "approved") {
    return NextResponse.json(
      { error: "Proposal promo codes are issued after your partnership is approved." },
      { status: 403 },
    )
  }

  if (partner.promoCode) {
    return NextResponse.json({
      promoCode: partner.promoCode,
      alreadyAssigned: true as const,
    })
  }

  try {
    const code = await ensurePartnerPromoCode(partner.id)
    return NextResponse.json({
      promoCode: code ?? null,
      alreadyAssigned: false as const,
    })
  } catch {
    return NextResponse.json(
      { error: "Unable to assign a code right now. Please try again or contact support." },
      { status: 500 },
    )
  }
}
