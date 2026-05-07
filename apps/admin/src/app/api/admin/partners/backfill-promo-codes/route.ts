import { auth } from "@repo/auth/server"
import { NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { db, ensurePartnerPromoCode, partners } from "@repo/db"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { USER_MANAGEMENT_ROLES, hasAnyTeamRole } from "@/lib/rbac"
import { getRequiredTenantId } from "@/lib/env"

/**
 * One-shot or repeatable: assign deterministic random promo codes to approved partners
 * that are missing one (e.g. after rolling out this feature).
 */
export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`partner-promo-backfill:${userId}`, 5, 60_000)
  if (limited) return limited

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, USER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()

  const ids = await db
    .select({ id: partners.id })
    .from(partners)
    .where(
      and(
        eq(partners.tenantId, tenantId),
        eq(partners.status, "approved"),
        isNull(partners.promoCode),
        isNull(partners.deletedAt),
      ),
    )

  let assigned = 0
  const errors: string[] = []

  for (const row of ids) {
    try {
      const code = await ensurePartnerPromoCode(row.id)
      if (code) assigned++
    } catch (e) {
      errors.push(`${row.id}: ${String(e)}`)
    }
  }

  return NextResponse.json({
    scanned: ids.length,
    assigned,
    errors: errors.length ? errors : undefined,
  })
}
