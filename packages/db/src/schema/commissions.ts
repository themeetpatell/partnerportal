import { index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { partners } from "./partners"

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id").notNull().references(() => partners.id),
    sourceType: text("source_type").notNull(), // lead | service_request
    sourceId: uuid("source_id").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("AED"),
    status: text("status").notNull().default("pending"),
    // pending | approved | processing | paid | disputed
    breakdown: text("breakdown"),
    calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
    approvedAt: timestamp("approved_at"),
    paidAt: timestamp("paid_at"),
    stripeTransferId: text("stripe_transfer_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("commissions_partner_status_idx").on(table.partnerId, table.status),
    index("commissions_source_idx").on(table.sourceType, table.sourceId),
  ],
)

export const payoutRequests = pgTable("payout_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id").notNull().references(() => partners.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("AED"),
  status: text("status").notNull().default("pending"), // pending | processing | paid | failed
  stripePayoutId: text("stripe_payout_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
