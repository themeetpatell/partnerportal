import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { partners } from "./partners"

export const partnerClients = pgTable(
  "partner_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    contactName: text("contact_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    nationality: text("nationality"),
    tradeLicenseNumber: text("trade_license_number"),
    country: text("country"),
    city: text("city"),
    status: text("status").notNull().default("active"),
    renewalDate: timestamp("renewal_date"),
    notes: text("notes"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("partner_clients_partner_deleted_created_idx").on(
      table.partnerId,
      table.deletedAt,
      table.createdAt
    ),
    index("partner_clients_email_idx").on(table.email),
    index("partner_clients_renewal_date_idx").on(table.renewalDate),
    index("partner_clients_status_idx").on(table.status),
  ]
)
