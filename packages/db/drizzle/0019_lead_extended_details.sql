ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lead_owner" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "deal_owner" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "partnership_manager" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "appointment_setter" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "industry" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "business_in_uae" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "transaction_band" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "business_ar_band" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "decision_role" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "urgency_timeline" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "budget_amount" numeric(12,2);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lost_reason" text;

CREATE TABLE IF NOT EXISTS "lead_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "author_id" text,
  "author_name" text,
  "note" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "lead_notes_lead_created_idx"
  ON "lead_notes" ("lead_id","created_at");

CREATE INDEX IF NOT EXISTS "lead_notes_tenant_created_idx"
  ON "lead_notes" ("tenant_id","created_at");
