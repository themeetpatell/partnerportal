import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { sql, isNull } from "drizzle-orm"
import { tenants } from "./tenants"
import { leads } from "./leads"

/** Synced quotes/proposals from the external pricing engine (Replit app). */
export const leadQuotes = pgTable(
  "lead_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    /** Stable id returned by pricing engine */
    engineQuoteId: text("engine_quote_id").notNull(),
    engineQuoteNumber: text("engine_quote_number"),
    deepLinkUrl: text("deep_link_url"),
    idempotencyKey: text("idempotency_key"),
    engineEnvironment: text("engine_environment"),
    syncStatus: text("sync_status").notNull().default("synced"),
    proposalStatus: text("proposal_status"),
    totalDisplay: text("total_display"),
    currency: text("currency").default("AED"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    proposalViewUrl: text("proposal_view_url"),
    pdfUrl: text("pdf_url"),
    engagementLetterStatus: text("engagement_letter_status"),
    stripePaymentStatus: text("stripe_payment_status"),
    onboardingPushedAt: timestamp("onboarding_pushed_at", { withTimezone: true }),
    enginePayloadUpdatedAt: timestamp("engine_payload_updated_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
    metaJson: text("meta_json"),
    createdByAuthUserId: text("created_by_auth_user_id"),
    createdBySource: text("created_by_source"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("lead_quotes_lead_idx").on(table.leadId),
    index("lead_quotes_tenant_lead_idx").on(table.tenantId, table.leadId),
    uniqueIndex("lead_quotes_tenant_engine_quote_uidx")
      .on(table.tenantId, table.engineQuoteId)
      .where(isNull(table.deletedAt)),
    uniqueIndex("lead_quotes_idempotency_uidx")
      .on(table.tenantId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL AND ${table.deletedAt} IS NULL`),
  ],
)

/** Idempotent webhook ingestion (pricing engine retries). */
export const pricingEngineWebhookEvents = pgTable(
  "pricing_engine_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    engineEventId: text("engine_event_id").notNull(),
    eventType: text("event_type").notNull(),
    quoteId: text("quote_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("pricing_engine_webhook_events_uidx").on(table.tenantId, table.engineEventId),
    index("pricing_engine_webhook_events_tenant_created_idx").on(table.tenantId, table.createdAt),
  ],
)
