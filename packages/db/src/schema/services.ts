import { pgTable, uuid, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { partners } from "./partners"

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

export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id").notNull().references(() => partners.id),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  customerCompany: text("customer_company").notNull(),
  customerContact: text("customer_contact").notNull(),
  customerEmail: text("customer_email").notNull(),
  status: text("status").notNull().default("pending"),
  // pending | in_progress | completed | cancelled
  startDate: timestamp("start_date"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
