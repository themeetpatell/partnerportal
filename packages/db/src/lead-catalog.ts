import { and, asc, count, eq } from "drizzle-orm"
import { db } from "./client"
import { leadCatalogItems } from "./schema/lead-catalog"

export type LeadCatalogItemRow = {
  id: string
  name: string
  code: string
  sortOrder: number
  isActive: boolean
}

export async function listLeadCatalogItems(
  tenantId: string,
  opts?: { activeOnly?: boolean },
): Promise<LeadCatalogItemRow[]> {
  const activeOnly = opts?.activeOnly ?? false
  const res = await db
    .select({
      id: leadCatalogItems.id,
      name: leadCatalogItems.name,
      code: leadCatalogItems.code,
      sortOrder: leadCatalogItems.sortOrder,
      isActive: leadCatalogItems.isActive,
    })
    .from(leadCatalogItems)
    .where(
      activeOnly
        ? and(eq(leadCatalogItems.tenantId, tenantId), eq(leadCatalogItems.isActive, true))
        : eq(leadCatalogItems.tenantId, tenantId),
    )
    .orderBy(asc(leadCatalogItems.sortOrder), asc(leadCatalogItems.name))

  return res
}

export async function getLeadCatalogNameList(tenantId: string): Promise<string[]> {
  const rows = await listLeadCatalogItems(tenantId, { activeOnly: true })
  return rows.map((r) => r.name)
}

export async function getLeadCatalogRows(
  tenantId: string,
): Promise<{ name: string; code: string }[]> {
  const rows = await listLeadCatalogItems(tenantId, { activeOnly: true })
  return rows.map((r) => ({ name: r.name, code: r.code }))
}

export async function getLeadCatalogItemById(
  tenantId: string,
  id: string,
): Promise<LeadCatalogItemRow | null> {
  const [row] = await db
    .select({
      id: leadCatalogItems.id,
      name: leadCatalogItems.name,
      code: leadCatalogItems.code,
      sortOrder: leadCatalogItems.sortOrder,
      isActive: leadCatalogItems.isActive,
    })
    .from(leadCatalogItems)
    .where(and(eq(leadCatalogItems.tenantId, tenantId), eq(leadCatalogItems.id, id)))
    .limit(1)
  return row ?? null
}

export async function countLeadCatalogItemsForTenant(tenantId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(leadCatalogItems)
    .where(eq(leadCatalogItems.tenantId, tenantId))
  return Number(row?.n ?? 0)
}
