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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "tier" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "channel" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "agreement_url" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "suspension_reason" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "permissions" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "row_scope" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "channel" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "on_behalf_note" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "lead_id" uuid;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "pricing" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "sla_status" text DEFAULT 'on_track' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "end_date" timestamp;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "on_behalf_note" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "service_request_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_notes" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "issued_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "voided_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "void_reason" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "activity_timelines" ADD CONSTRAINT "activity_timelines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;