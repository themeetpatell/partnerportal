-- Unify cross-sell (service_requests) into leads with intake_type + optional source_lead_id.
-- Legacy service request rows are kept for invoice FKs; inbox and workflows use leads only.

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "intake_type" text NOT NULL DEFAULT 'new_lead';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "source_lead_id" uuid;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "legacy_service_request_id" uuid;

ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "migrated_to_lead_id" uuid;

DO $$ BEGIN
  ALTER TABLE "leads" ADD CONSTRAINT "leads_source_lead_id_leads_id_fk"
    FOREIGN KEY ("source_lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_migrated_to_lead_id_leads_id_fk"
    FOREIGN KEY ("migrated_to_lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "leads_legacy_service_request_id_unique"
  ON "leads" ("legacy_service_request_id")
  WHERE "legacy_service_request_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "leads_intake_type_idx" ON "leads" ("intake_type");

INSERT INTO "leads" (
  "tenant_id",
  "partner_id",
  "customer_name",
  "customer_email",
  "customer_company",
  "service_interest",
  "notes",
  "status",
  "assigned_to",
  "created_at",
  "updated_at",
  "intake_type",
  "source_lead_id",
  "legacy_service_request_id",
  "proposal_summary",
  "lost_reason",
  "converted_at",
  "proposal_amount",
  "first_name",
  "last_name",
  "source"
)
SELECT
  sr."tenant_id",
  sr."partner_id",
  sr."customer_contact",
  sr."customer_email",
  sr."customer_company",
  CASE
    WHEN sr."services_list" IS NOT NULL AND btrim(sr."services_list") <> '' THEN sr."services_list"
    WHEN svc."name" IS NOT NULL THEN (jsonb_build_array(svc."name"))::text
    ELSE '[]'
  END,
  sr."notes",
  CASE sr."status"
    WHEN 'pending' THEN 'submitted'
    WHEN 'in_progress' THEN 'lead_follow_up'
    WHEN 'completed' THEN 'deal_won'
    WHEN 'cancelled' THEN 'deal_lost'
    ELSE 'submitted'
  END,
  sr."assigned_to",
  sr."created_at",
  sr."updated_at",
  'existing_lead',
  sr."lead_id",
  sr."id",
  'Imported from legacy service request.',
  CASE WHEN sr."status" = 'cancelled' THEN 'Closed as service request (legacy import).' ELSE NULL END,
  CASE
    WHEN sr."status" = 'completed' AND sr."completed_at" IS NOT NULL THEN sr."completed_at"
    ELSE NULL
  END,
  sr."pricing",
  NULL::text,
  NULL::text,
  'legacy_service_request'
FROM "service_requests" sr
LEFT JOIN "services" svc ON svc."id" = sr."service_id"
WHERE sr."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "leads" l2 WHERE l2."legacy_service_request_id" = sr."id"
  );

UPDATE "service_requests" sr
SET "migrated_to_lead_id" = l."id"
FROM "leads" l
WHERE l."legacy_service_request_id" = sr."id"
  AND sr."migrated_to_lead_id" IS NULL;

UPDATE "commissions" c
SET
  "source_type" = 'lead',
  "source_id" = l."id",
  "related_lead_id" = COALESCE(c."related_lead_id", l."source_lead_id")
FROM "leads" l
WHERE c."source_type" = 'service_request'
  AND l."legacy_service_request_id" IS NOT NULL
  AND c."source_id" = l."legacy_service_request_id";

UPDATE "documents" d
SET "owner_type" = 'lead', "owner_id" = l."id"
FROM "leads" l
WHERE d."owner_type" = 'service_request'
  AND l."legacy_service_request_id" = d."owner_id";
