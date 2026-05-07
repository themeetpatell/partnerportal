CREATE TABLE IF NOT EXISTS "lead_quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "engine_quote_id" text NOT NULL,
  "engine_quote_number" text,
  "deep_link_url" text,
  "idempotency_key" text,
  "engine_environment" text,
  "sync_status" text DEFAULT 'synced' NOT NULL,
  "proposal_status" text,
  "total_display" text,
  "currency" text DEFAULT 'AED',
  "expires_at" timestamptz,
  "proposal_view_url" text,
  "pdf_url" text,
  "engagement_letter_status" text,
  "stripe_payment_status" text,
  "onboarding_pushed_at" timestamptz,
  "engine_payload_updated_at" timestamptz,
  "last_synced_at" timestamptz DEFAULT now() NOT NULL,
  "meta_json" text,
  "created_by_auth_user_id" text,
  "created_by_source" text,
  "deleted_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "lead_quotes_lead_idx" ON "lead_quotes" ("lead_id");
CREATE INDEX IF NOT EXISTS "lead_quotes_tenant_lead_idx" ON "lead_quotes" ("tenant_id", "lead_id");

CREATE UNIQUE INDEX IF NOT EXISTS "lead_quotes_tenant_engine_quote_uidx"
  ON "lead_quotes" ("tenant_id", "engine_quote_id")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "lead_quotes_idempotency_uidx"
  ON "lead_quotes" ("tenant_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL AND "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "pricing_engine_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "engine_event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "quote_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "pricing_engine_webhook_events_uidx_def" UNIQUE ("tenant_id", "engine_event_id")
);

CREATE INDEX IF NOT EXISTS "pricing_engine_webhook_events_tenant_created_idx"
  ON "pricing_engine_webhook_events" ("tenant_id", "created_at");
