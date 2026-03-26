import { pgTable, uuid, text, timestamp, numeric } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { partners } from "./partners"

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id").notNull().references(() => partners.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("AED"),
  status: text("status").notNull().default("draft"),
  // draft | sent | paid | overdue | cancelled
  dueDate: timestamp("due_date").notNull(),
  stripeInvoiceId: text("stripe_invoice_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
