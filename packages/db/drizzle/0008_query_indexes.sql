CREATE INDEX IF NOT EXISTS "leads_partner_deleted_created_idx"
  ON "leads" ("partner_id", "deleted_at", "created_at");

CREATE INDEX IF NOT EXISTS "leads_status_idx"
  ON "leads" ("status");

CREATE INDEX IF NOT EXISTS "leads_zoho_lead_id_idx"
  ON "leads" ("zoho_lead_id");

CREATE INDEX IF NOT EXISTS "leads_zoho_deal_id_idx"
  ON "leads" ("zoho_deal_id");

CREATE INDEX IF NOT EXISTS "service_requests_partner_deleted_created_idx"
  ON "service_requests" ("partner_id", "deleted_at", "created_at");

CREATE INDEX IF NOT EXISTS "service_requests_service_id_idx"
  ON "service_requests" ("service_id");

CREATE INDEX IF NOT EXISTS "service_requests_status_idx"
  ON "service_requests" ("status");

CREATE INDEX IF NOT EXISTS "commissions_partner_status_idx"
  ON "commissions" ("partner_id", "status");

CREATE INDEX IF NOT EXISTS "commissions_source_idx"
  ON "commissions" ("source_type", "source_id");
