import { index, pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    ownerType: text("owner_type").notNull(), // partner | lead | service_request
    ownerId: uuid("owner_id").notNull(),
    documentType: text("document_type").notNull(),
    fileName: text("file_name").notNull(),
    zohoWorkdriveId: text("zoho_workdrive_id").notNull(),
    zohoWorkdriveUrl: text("zoho_workdrive_url").notNull(),
    storageProvider: text("storage_provider").notNull().default("workdrive"), // workdrive | database
    mimeType: text("mime_type"),
    fileDataBase64: text("file_data_base64"),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  },
  (table) => [index("documents_owner_idx").on(table.ownerType, table.ownerId)],
)

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id"),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    isRead: text("is_read").notNull().default("false"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("notifications_partner_read_created_idx").on(
      table.partnerId,
      table.isRead,
      table.createdAt,
    ),
  ],
)

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    diff: text("diff"), // JSON
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_tenant_created_idx").on(table.tenantId, table.createdAt),
  ],
)

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

// Activity timeline per entity (partner | lead | service_request | invoice | commission)
export const activityTimelines = pgTable(
  "activity_timelines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    actorId: text("actor_id").notNull(), // auth user id
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(), // e.g. "status_changed", "created", "note_added"
    note: text("note"),
    metadata: text("metadata"), // JSON: before/after values, etc.
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("activity_timelines_entity_created_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
  ],
)

// Saved filter views per user per context
export const savedFilters = pgTable(
  "saved_filters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // auth user id
    name: text("name").notNull(),
    context: text("context").notNull(), // analytics | leads | partners | services | invoices
    filters: text("filters").notNull().default("{}"), // JSON serialised filter state
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("saved_filters_user_context_idx").on(table.userId, table.context)],
)
