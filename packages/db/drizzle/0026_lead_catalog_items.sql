CREATE TABLE IF NOT EXISTS "lead_catalog_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "lead_catalog_items_tenant_name_uidx"
  ON "lead_catalog_items" ("tenant_id", "name");

CREATE INDEX IF NOT EXISTS "lead_catalog_items_tenant_active_sort_idx"
  ON "lead_catalog_items" ("tenant_id", "is_active", "sort_order", "name");

INSERT INTO "lead_catalog_items" ("tenant_id", "name", "code", "sort_order", "is_active")
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Corporate Tax Registration', 'CTR', 10, true),
  ('00000000-0000-0000-0000-000000000001', 'Corporate Tax Filing', 'CTF', 20, true),
  ('00000000-0000-0000-0000-000000000001', 'VAT Registration', 'VATR', 30, true),
  ('00000000-0000-0000-0000-000000000001', 'VAT Filing', 'VATF', 40, true),
  ('00000000-0000-0000-0000-000000000001', 'Monthly Accounting', 'MACC', 50, true),
  ('00000000-0000-0000-0000-000000000001', 'Quarterly Accounting', 'QACC', 60, true),
  ('00000000-0000-0000-0000-000000000001', 'Annual Accounting', 'AACC', 70, true),
  ('00000000-0000-0000-0000-000000000001', 'Financial Statement Preparation', 'FSP', 80, true),
  ('00000000-0000-0000-0000-000000000001', 'Auditing', 'AUD', 90, true),
  ('00000000-0000-0000-0000-000000000001', 'Liquidation', 'LIQ', 100, true),
  ('00000000-0000-0000-0000-000000000001', 'Audited Financial Statements', 'AFS', 110, true),
  ('00000000-0000-0000-0000-000000000001', 'Management Accounting', 'MACCT', 120, true),
  ('00000000-0000-0000-0000-000000000001', 'AML Compliance', 'AMLC', 130, true),
  ('00000000-0000-0000-0000-000000000001', 'Fractional CFO - hourly', 'CFO', 140, true),
  ('00000000-0000-0000-0000-000000000001', 'Financial Modelling', 'FMOD', 150, true),
  ('00000000-0000-0000-0000-000000000001', 'FTA Amendments', 'FTA', 160, true),
  ('00000000-0000-0000-0000-000000000001', 'Corporate Tax Deregistration', 'CTDR', 170, true),
  ('00000000-0000-0000-0000-000000000001', 'VAT Deregistration', 'VATDR', 180, true),
  ('00000000-0000-0000-0000-000000000001', 'Accounting', 'ACC', 190, true),
  ('00000000-0000-0000-0000-000000000001', 'Salary Benchmarking', 'SBR', 200, true)
ON CONFLICT ("tenant_id", "name") DO NOTHING;
