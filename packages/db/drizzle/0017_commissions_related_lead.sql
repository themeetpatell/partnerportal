-- Tie commission rows back to originating lead for reporting + recurring billing rows.
ALTER TABLE "commissions" ADD COLUMN IF NOT EXISTS "related_lead_id" uuid REFERENCES "leads"("id") ON DELETE SET NULL;

UPDATE "commissions"
SET "related_lead_id" = "source_id"
WHERE "source_type" = 'lead' AND "related_lead_id" IS NULL;

CREATE INDEX IF NOT EXISTS "commissions_related_lead_id_idx"
  ON "commissions" ("related_lead_id");

-- Replaced non-unique index from 0016 with partial unique constraint (idempotent webhook-safe).
DROP INDEX IF EXISTS "commissions_stripe_invoice_id_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "commissions_stripe_invoice_id_unique"
  ON "commissions" ("stripe_invoice_id")
  WHERE "stripe_invoice_id" IS NOT NULL;
