-- Commission invoice: link multiple won / pipeline leads (JSON array of UUID strings).
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "related_lead_ids" text;

-- CRM-style activities (calls, meetings, emails, tasks) per partner account.
CREATE TABLE IF NOT EXISTS "crm_activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE cascade,
  "lead_id" uuid REFERENCES "leads"("id") ON DELETE set null,
  "activity_type" text NOT NULL,
  "subject" text NOT NULL,
  "description" text,
  "scheduled_at" timestamp NOT NULL,
  "end_at" timestamp,
  "duration_minutes" integer,
  "location" text,
  "meeting_url" text,
  "outcome" text,
  "status" text NOT NULL DEFAULT 'scheduled',
  "assigned_to_team_member_id" uuid REFERENCES "team_members"("id") ON DELETE set null,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "crm_activities_tenant_partner_scheduled_idx"
  ON "crm_activities" ("tenant_id", "partner_id", "scheduled_at");

CREATE INDEX IF NOT EXISTS "crm_activities_tenant_assigned_scheduled_idx"
  ON "crm_activities" ("tenant_id", "assigned_to_team_member_id", "scheduled_at");
