CREATE TABLE "partner_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text,
	"phone" text,
	"country" text,
	"city" text,
	"status" text DEFAULT 'active' NOT NULL,
	"renewal_date" timestamp,
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partner_clients" ADD CONSTRAINT "partner_clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "partner_clients" ADD CONSTRAINT "partner_clients_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "partner_clients_partner_deleted_created_idx" ON "partner_clients" USING btree ("partner_id","deleted_at","created_at");
--> statement-breakpoint
CREATE INDEX "partner_clients_email_idx" ON "partner_clients" USING btree ("email");
--> statement-breakpoint
CREATE INDEX "partner_clients_renewal_date_idx" ON "partner_clients" USING btree ("renewal_date");
--> statement-breakpoint
CREATE INDEX "partner_clients_status_idx" ON "partner_clients" USING btree ("status");
