import { index, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { isNotNull } from "drizzle-orm"
import { tenants } from "./tenants"
import { partners } from "./partners"
import { leads } from "./leads"

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id").notNull().references(() => partners.id),
    sourceType: text("source_type").notNull(),
    // lead | lead_recurring_invoice | service_request
    sourceId: uuid("source_id").notNull(),
    relatedLeadId: uuid("related_lead_id").references(() => leads.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("AED"),
    status: text("status").notNull().default("pending"),
    // pending | approved | processing | paid | disputed
    breakdown: text("breakdown"),
    calculationSnapshot: jsonb("calculation_snapshot").$type<Record<string, unknown> | null>(),
    stripeInvoiceId: text("stripe_invoice_id"),
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
    index("commissions_related_lead_id_idx").on(table.relatedLeadId),
    uniqueIndex("commissions_stripe_invoice_id_unique")
      .on(table.stripeInvoiceId)
      .where(isNotNull(table.stripeInvoiceId)),
  ],
)

export const payoutRequests = pgTable("payout_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id").notNull().references(() => partners.id),
  commissionId: uuid("commission_id").notNull().references(() => commissions.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("AED"),
  status: text("status").notNull().default("pending"), // pending | processing | paid | failed
  stripePayoutId: text("stripe_payout_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("payout_requests_commission_idx").on(table.commissionId),
  index("payout_requests_partner_status_idx").on(table.partnerId, table.status),
])
