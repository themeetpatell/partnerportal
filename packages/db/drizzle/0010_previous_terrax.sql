ALTER TABLE "leads" ADD COLUMN "crm_services_list" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "crm_proposal" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "crm_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "crm_closing_date" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "crm_ar_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "crm_industry" text;--> statement-breakpoint
