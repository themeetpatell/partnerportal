import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

/**
 * Tenant-configurable picklist for lead “services of interest” (partner + admin CRM forms).
 * Distinct from operational `services` (pricing / service requests).
 */
export const leadCatalogItems = pgTable(
  "lead_catalog_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("lead_catalog_items_tenant_name_uidx").on(table.tenantId, table.name),
    index("lead_catalog_items_tenant_active_sort_idx").on(
      table.tenantId,
      table.isActive,
      table.sortOrder,
      table.name,
    ),
  ],
)
