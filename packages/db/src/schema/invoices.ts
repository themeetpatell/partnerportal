import { index, pgTable, uuid, text, timestamp, numeric } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { partners } from "./partners"
import { serviceRequests } from "./services"

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id").notNull().references(() => partners.id),
    serviceRequestId: uuid("service_request_id").references(() => serviceRequests.id),
    invoiceNumber: text("invoice_number").notNull().unique(),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
    tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("AED"),
    status: text("status").notNull().default("draft"),
    // draft | sent | paid | overdue | cancelled
    paymentTerms: text("payment_terms"), // e.g. "Net 30"
    paymentNotes: text("payment_notes"),
    dueDate: timestamp("due_date").notNull(),
    issuedAt: timestamp("issued_at"),
    stripeInvoiceId: text("stripe_invoice_id"),
    paidAt: timestamp("paid_at"),
    voidedAt: timestamp("voided_at"),
    voidReason: text("void_reason"),
    createdBy: text("created_by"), // auth user id of finance/admin
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("invoices_partner_deleted_created_idx").on(
      table.partnerId,
      table.deletedAt,
      table.createdAt,
    ),
    index("invoices_tenant_status_idx").on(table.tenantId, table.status),
    index("invoices_status_due_idx").on(table.status, table.dueDate),
    index("invoices_service_request_idx").on(table.serviceRequestId),
  ],
)
