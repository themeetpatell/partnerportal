import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { partners } from "./partners"

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id").notNull().references(() => partners.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  customerCompany: text("customer_company"),
  serviceInterest: text("service_interest").notNull().default("[]"), // JSON array
  notes: text("notes"),
  status: text("status").notNull().default("submitted"),
  // submitted | in_review | qualified | proposal_sent | converted | rejected
  assignedTo: text("assigned_to"), // team_member clerk_user_id
  zohoLeadId: text("zoho_lead_id"),
  zohoDealId: text("zoho_deal_id"),
  convertedAt: timestamp("converted_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
