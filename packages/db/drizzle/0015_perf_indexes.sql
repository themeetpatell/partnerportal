-- Performance indexes — adds indexes on FK and hot filter columns to eliminate
-- sequential scans on auth-path queries (team_members lookup), tenant-scoped
-- list queries, and entity-keyed lookups (documents, audit_logs, timelines).
-- All statements use IF NOT EXISTS for idempotency. See packages/db/src/schema/*
-- for declarative counterparts.

-- partners: 0 indexes prior to this migration. authUserId is already covered
-- by its UNIQUE constraint.
CREATE INDEX IF NOT EXISTS "partners_tenant_deleted_created_idx"
  ON "partners" ("tenant_id", "deleted_at", "created_at");

CREATE INDEX IF NOT EXISTS "partners_tenant_status_idx"
  ON "partners" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "partners_email_idx"
  ON "partners" ("email");

-- Functional index for case-insensitive email fallback in partner-record lookup
-- (every partner dashboard request hits this). Query layer uses
-- LOWER(email) = ? to leverage it.
CREATE INDEX IF NOT EXISTS "partners_email_lower_idx"
  ON "partners" (LOWER("email"));

CREATE INDEX IF NOT EXISTS "partners_status_idx"
  ON "partners" ("status");

-- team_members: hit on EVERY admin dashboard request via getActiveTeamMember.
CREATE INDEX IF NOT EXISTS "team_members_auth_user_active_idx"
  ON "team_members" ("auth_user_id", "is_active");

CREATE INDEX IF NOT EXISTS "team_members_tenant_active_idx"
  ON "team_members" ("tenant_id", "is_active");

-- Functional index for case-insensitive email lookup fallback (admin-auth
-- ilike path). Not declared in the Drizzle schema because it is an expression
-- index; query layer will use LOWER(email) = LOWER(?) to leverage it.
CREATE INDEX IF NOT EXISTS "team_members_email_lower_idx"
  ON "team_members" (LOWER("email"));

-- commission_models
CREATE INDEX IF NOT EXISTS "commission_models_tenant_active_idx"
  ON "commission_models" ("tenant_id", "is_active");

-- leads: extends existing indexes with tenant-wide and customer email lookups.
CREATE INDEX IF NOT EXISTS "leads_tenant_deleted_created_idx"
  ON "leads" ("tenant_id", "deleted_at", "created_at");

CREATE INDEX IF NOT EXISTS "leads_customer_email_idx"
  ON "leads" ("customer_email");

-- invoices: 0 indexes prior to this migration.
CREATE INDEX IF NOT EXISTS "invoices_partner_deleted_created_idx"
  ON "invoices" ("partner_id", "deleted_at", "created_at");

CREATE INDEX IF NOT EXISTS "invoices_tenant_status_idx"
  ON "invoices" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "invoices_status_due_idx"
  ON "invoices" ("status", "due_date");

CREATE INDEX IF NOT EXISTS "invoices_service_request_idx"
  ON "invoices" ("service_request_id");

-- services
CREATE INDEX IF NOT EXISTS "services_tenant_active_idx"
  ON "services" ("tenant_id", "is_active");

-- service_requests: extends existing indexes with tenant-wide list and lead linkage.
CREATE INDEX IF NOT EXISTS "service_requests_tenant_deleted_created_idx"
  ON "service_requests" ("tenant_id", "deleted_at", "created_at");

CREATE INDEX IF NOT EXISTS "service_requests_lead_id_idx"
  ON "service_requests" ("lead_id");

-- documents: entity-keyed lookups (partner | lead | service_request).
CREATE INDEX IF NOT EXISTS "documents_owner_idx"
  ON "documents" ("owner_type", "owner_id");

-- notifications
CREATE INDEX IF NOT EXISTS "notifications_partner_read_created_idx"
  ON "notifications" ("partner_id", "is_read", "created_at");

-- audit_logs
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx"
  ON "audit_logs" ("entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "audit_logs_tenant_created_idx"
  ON "audit_logs" ("tenant_id", "created_at");

-- activity_timelines
CREATE INDEX IF NOT EXISTS "activity_timelines_entity_created_idx"
  ON "activity_timelines" ("entity_type", "entity_id", "created_at");

-- saved_filters
CREATE INDEX IF NOT EXISTS "saved_filters_user_context_idx"
  ON "saved_filters" ("user_id", "context");
