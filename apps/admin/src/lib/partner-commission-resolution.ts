import { db, commissionModels, leads, partners } from "@repo/db"
import { and, eq, sql } from "drizzle-orm"
import type { CommissionModel } from "@repo/types"

export function parseCommissionRate(value: string | null | undefined): number | null {
  if (!value) {
    return null
  }

  const normalized = value.replace(/%/g, "").trim()
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null
  }

  return parsed
}

export async function resolvePartnerCommissionModel(
  partner: typeof partners.$inferSelect,
): Promise<CommissionModel | null> {
  if (partner.commissionModelId) {
    const [storedModel] = await db
      .select()
      .from(commissionModels)
      .where(
        and(
          eq(commissionModels.id, partner.commissionModelId),
          eq(commissionModels.tenantId, partner.tenantId),
        ),
      )
      .limit(1)

    if (storedModel) {
      try {
        return {
          id: storedModel.id,
          tenantId: storedModel.tenantId,
          name: storedModel.name,
          type: storedModel.type as CommissionModel["type"],
          config: JSON.parse(storedModel.config),
          isActive: storedModel.isActive,
          createdAt: storedModel.createdAt,
        }
      } catch (error) {
        console.error("[commission] Invalid commission model config:", error)
      }
    }
  }

  const commissionRate = parseCommissionRate(partner.commissionRate)
  const commissionType = partner.commissionType?.trim().toLowerCase()
  if (
    commissionRate == null ||
    (commissionType && !["flat", "percentage"].includes(commissionType))
  ) {
    return null
  }

  return {
    id: partner.commissionModelId ?? partner.id,
    tenantId: partner.tenantId,
    name: "Partner Commission",
    type: "flat_pct",
    config: { pct: commissionRate },
    isActive: true,
    createdAt: new Date(),
  }
}

/** Count of leads in `deal_won` for tiered / snapshot commission math. */
export async function countPartnerDealWonLeads(partnerId: string): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(eq(leads.partnerId, partnerId), eq(leads.status, "deal_won")))

  return Number(row?.c ?? 0)
}
