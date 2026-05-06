-- Commission audit trail (CRM gross/net/VAT) + Stripe invoice linkage for cash confirmation.
ALTER TABLE "commissions" ADD COLUMN IF NOT EXISTS "calculation_snapshot" jsonb;
ALTER TABLE "commissions" ADD COLUMN IF NOT EXISTS "stripe_invoice_id" text;

CREATE INDEX IF NOT EXISTS "commissions_stripe_invoice_id_idx"
  ON "commissions" ("stripe_invoice_id");
