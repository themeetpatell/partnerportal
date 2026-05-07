ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "promo_code" text;

CREATE INDEX IF NOT EXISTS "partners_promo_lookup_idx"
  ON "partners" ("tenant_id", "promo_code");

CREATE UNIQUE INDEX IF NOT EXISTS "partners_tenant_promo_code_uidx"
  ON "partners" ("tenant_id", upper("promo_code"))
  WHERE "promo_code" IS NOT NULL AND "deleted_at" IS NULL;
