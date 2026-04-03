import { boolean, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { partners } from "./partners"
import { leads } from "./leads"

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  requiredDocuments: text("required_documents").notNull().default("[]"), // JSON array
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id").notNull().references(() => partners.id),
    serviceId: uuid("service_id").references(() => services.id), // nullable — replaced by servicesList
    servicesList: text("services_list"), // JSON array of selected service names
    leadId: uuid("lead_id").references(() => leads.id), // optional link to lead
    customerCompany: text("customer_company").notNull(),
    customerContact: text("customer_contact").notNull(),
    customerEmail: text("customer_email").notNull(),
    status: text("status").notNull().default("pending"),
    // pending | in_progress | completed | cancelled
    pricing: numeric("pricing", { precision: 10, scale: 2 }),
    slaStatus: text("sla_status").notNull().default("on_track"), // on_track | at_risk | breached
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
    notes: text("notes"),
    assignedTo: text("assigned_to"),
    createdBy: text("created_by"), // admin who created on behalf
    onBehalfNote: text("on_behalf_note"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("service_requests_partner_deleted_created_idx").on(
      table.partnerId,
      table.deletedAt,
      table.createdAt,
    ),
    index("service_requests_service_id_idx").on(table.serviceId),
    index("service_requests_status_idx").on(table.status),
  ],
)
