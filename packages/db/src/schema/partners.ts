import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

export const commissionModels = pgTable("commission_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // flat_pct | tiered | milestone
  config: text("config").notNull(), // JSON string
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  type: text("type").notNull(), // referral | channel
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | suspended
  commissionModelId: uuid("commission_model_id").references(() => commissionModels.id),
  zohoContactId: text("zoho_contact_id"),
  rejectionReason: text("rejection_reason"),
  onboardedAt: timestamp("onboarded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  role: text("role").notNull(), // sales | ops | finance | admin
  name: text("name").notNull(),
  email: text("email").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
