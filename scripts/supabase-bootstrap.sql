-- Supabase bootstrap script generated from Drizzle migrations
-- Generated: 2026-04-02
create extension if not exists pgcrypto;

-- BEGIN packages/db/drizzle/0000_add_partner_extended_fields.sql
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"custom_domain" text,
	"branding_config" jsonb,
	"plan" text DEFAULT 'starter' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);

CREATE TABLE "commission_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"config" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"type" text NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"commission_model_id" uuid,
	"commission_type" text,
	"commission_rate" text,
	"website" text,
	"linkedin_id" text,
	"nationality" text,
	"business_size" text,
	"partner_industry" text,
	"overview" text,
	"partner_address" text,
	"vat_registered" boolean,
	"vat_number" text,
	"trade_license" text,
	"emirate_id_passport" text,
	"beneficiary_name" text,
	"bank_name" text,
	"bank_country" text,
	"account_no_iban" text,
	"swift_bic_code" text,
	"payment_frequency" text,
	"zoho_contact_id" text,
	"rejection_reason" text,
	"onboarded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partners_clerk_user_id_unique" UNIQUE("clerk_user_id")
);

CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text,
	"customer_company" text,
	"service_interest" text DEFAULT '[]' NOT NULL,
	"notes" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"assigned_to" text,
	"zoho_lead_id" text,
	"zoho_deal_id" text,
	"converted_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"customer_company" text NOT NULL,
	"customer_contact" text NOT NULL,
	"customer_email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"start_date" timestamp,
	"completed_at" timestamp,
	"notes" text,
	"assigned_to" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"required_documents" text DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"breakdown" text,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"stripe_transfer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "payout_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_payout_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"due_date" timestamp NOT NULL,
	"stripe_invoice_id" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);

CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"key_hash" text NOT NULL,
	"name" text NOT NULL,
	"scopes" text DEFAULT '[]' NOT NULL,
	"last_used_at" timestamp,
	"is_active" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);

CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"diff" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"file_name" text NOT NULL,
	"zoho_workdrive_id" text NOT NULL,
	"zoho_workdrive_url" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"partner_id" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_read" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"url" text NOT NULL,
	"events" text DEFAULT '[]' NOT NULL,
	"secret_hash" text NOT NULL,
	"is_active" text DEFAULT 'true' NOT NULL,
	"last_fired_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "commission_models" ADD CONSTRAINT "commission_models_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partners" ADD CONSTRAINT "partners_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partners" ADD CONSTRAINT "partners_commission_model_id_commission_models_id_fk" FOREIGN KEY ("commission_model_id") REFERENCES "public"."commission_models"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "leads" ADD CONSTRAINT "leads_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
-- END packages/db/drizzle/0000_add_partner_extended_fields.sql

-- BEGIN packages/db/drizzle/0001_add_analytics_rbac_governance.sql
CREATE TABLE "activity_timelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "saved_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"context" text NOT NULL,
	"filters" text DEFAULT '{}' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "partners" ADD COLUMN "tier" text;
ALTER TABLE "partners" ADD COLUMN "region" text;
ALTER TABLE "partners" ADD COLUMN "country" text;
ALTER TABLE "partners" ADD COLUMN "city" text;
ALTER TABLE "partners" ADD COLUMN "channel" text;
ALTER TABLE "partners" ADD COLUMN "owner_id" uuid;
ALTER TABLE "partners" ADD COLUMN "agreement_url" text;
ALTER TABLE "partners" ADD COLUMN "suspension_reason" text;
ALTER TABLE "partners" ADD COLUMN "deleted_at" timestamp;
ALTER TABLE "team_members" ADD COLUMN "permissions" text DEFAULT '{}' NOT NULL;
ALTER TABLE "team_members" ADD COLUMN "row_scope" text DEFAULT 'all' NOT NULL;
ALTER TABLE "team_members" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "leads" ADD COLUMN "source" text;
ALTER TABLE "leads" ADD COLUMN "channel" text;
ALTER TABLE "leads" ADD COLUMN "region" text;
ALTER TABLE "leads" ADD COLUMN "country" text;
ALTER TABLE "leads" ADD COLUMN "city" text;
ALTER TABLE "leads" ADD COLUMN "created_by" text;
ALTER TABLE "leads" ADD COLUMN "on_behalf_note" text;
ALTER TABLE "leads" ADD COLUMN "deleted_at" timestamp;
ALTER TABLE "service_requests" ADD COLUMN "lead_id" uuid;
ALTER TABLE "service_requests" ADD COLUMN "pricing" numeric(10, 2);
ALTER TABLE "service_requests" ADD COLUMN "sla_status" text DEFAULT 'on_track' NOT NULL;
ALTER TABLE "service_requests" ADD COLUMN "end_date" timestamp;
ALTER TABLE "service_requests" ADD COLUMN "cancelled_at" timestamp;
ALTER TABLE "service_requests" ADD COLUMN "created_by" text;
ALTER TABLE "service_requests" ADD COLUMN "on_behalf_note" text;
ALTER TABLE "service_requests" ADD COLUMN "deleted_at" timestamp;
ALTER TABLE "invoices" ADD COLUMN "service_request_id" uuid;
ALTER TABLE "invoices" ADD COLUMN "discount" numeric(10, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "invoices" ADD COLUMN "payment_terms" text;
ALTER TABLE "invoices" ADD COLUMN "payment_notes" text;
ALTER TABLE "invoices" ADD COLUMN "issued_at" timestamp;
ALTER TABLE "invoices" ADD COLUMN "voided_at" timestamp;
ALTER TABLE "invoices" ADD COLUMN "void_reason" text;
ALTER TABLE "invoices" ADD COLUMN "created_by" text;
ALTER TABLE "invoices" ADD COLUMN "deleted_at" timestamp;
ALTER TABLE "activity_timelines" ADD CONSTRAINT "activity_timelines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;
-- END packages/db/drizzle/0001_add_analytics_rbac_governance.sql

-- BEGIN packages/db/drizzle/0002_clumsy_hex.sql
ALTER TABLE "team_members" ADD COLUMN "phone" text;
ALTER TABLE "team_members" ADD COLUMN "designation" text;
-- END packages/db/drizzle/0002_clumsy_hex.sql

-- BEGIN packages/db/drizzle/0003_silly_nightshade.sql
ALTER TABLE "partners" ADD COLUMN "contract_status" text DEFAULT 'not_sent' NOT NULL;
ALTER TABLE "partners" ADD COLUMN "contract_signed_at" timestamp;
ALTER TABLE "partners" ADD COLUMN "meeting_completed_at" timestamp;
ALTER TABLE "partners" ADD COLUMN "nurturing_started_at" timestamp;
ALTER TABLE "partners" ADD COLUMN "designation" text;
ALTER TABLE "partners" ADD COLUMN "partnership_manager" text;
ALTER TABLE "partners" ADD COLUMN "appointments_setter" text;
ALTER TABLE "partners" ADD COLUMN "strategic_funnel_stage" text;
ALTER TABLE "partners" ADD COLUMN "activation_date" timestamp;
ALTER TABLE "partners" ADD COLUMN "last_met_on" timestamp;
ALTER TABLE "partners" ADD COLUMN "meeting_scheduled_date_as" timestamp;
ALTER TABLE "partners" ADD COLUMN "meeting_date_pm" timestamp;
ALTER TABLE "partners" ADD COLUMN "partners_id" text;
ALTER TABLE "partners" ADD COLUMN "partnership_level" text;
ALTER TABLE "partners" ADD COLUMN "agreement_start_date" timestamp;
ALTER TABLE "partners" ADD COLUMN "agreement_end_date" timestamp;
ALTER TABLE "partners" ADD COLUMN "sales_training_done" boolean DEFAULT false;
ALTER TABLE "partners" ADD COLUMN "date_of_birth" text;
ALTER TABLE "partners" ADD COLUMN "secondary_email" text;
ALTER TABLE "partners" ADD COLUMN "email_opt_out" boolean DEFAULT false;
-- END packages/db/drizzle/0003_silly_nightshade.sql

-- BEGIN packages/db/drizzle/0004_huge_molten_man.sql
ALTER TABLE "partners" ADD COLUMN "zoho_sign_request_id" text;
ALTER TABLE "partners" ADD COLUMN "contract_sent_at" timestamp;
-- END packages/db/drizzle/0004_huge_molten_man.sql

-- BEGIN packages/db/drizzle/0005_ordinary_millenium_guard.sql
ALTER TABLE "partners" ADD COLUMN "contract_signed_name" text;
ALTER TABLE "partners" ADD COLUMN "contract_signed_designation" text;
ALTER TABLE "partners" ADD COLUMN "contract_signature_type" text;
ALTER TABLE "partners" ADD COLUMN "contract_signature_data_url" text;
-- END packages/db/drizzle/0005_ordinary_millenium_guard.sql

-- BEGIN packages/db/drizzle/0006_chemical_champions.sql
ALTER TABLE "documents" ADD COLUMN "storage_provider" text DEFAULT 'workdrive' NOT NULL;
ALTER TABLE "documents" ADD COLUMN "mime_type" text;
ALTER TABLE "documents" ADD COLUMN "file_data_base64" text;
-- END packages/db/drizzle/0006_chemical_champions.sql

