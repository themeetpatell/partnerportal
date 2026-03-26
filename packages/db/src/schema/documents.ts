import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  ownerType: text("owner_type").notNull(), // partner | lead | service_request
  ownerId: uuid("owner_id").notNull(),
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  zohoWorkdriveId: text("zoho_workdrive_id").notNull(),
  zohoWorkdriveUrl: text("zoho_workdrive_url").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
})

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: text("is_read").notNull().default("false"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  diff: text("diff"), // JSON
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  name: text("name").notNull(),
  scopes: text("scopes").notNull().default("[]"), // JSON array
  lastUsedAt: timestamp("last_used_at"),
  isActive: text("is_active").notNull().default("true"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id").notNull(),
  url: text("url").notNull(),
  events: text("events").notNull().default("[]"), // JSON array
  secretHash: text("secret_hash").notNull(),
  isActive: text("is_active").notNull().default("true"),
  lastFiredAt: timestamp("last_fired_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
