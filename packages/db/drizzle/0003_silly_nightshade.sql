ALTER TABLE "partners" ADD COLUMN "contract_status" text DEFAULT 'not_sent' NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "contract_signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "meeting_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "nurturing_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "designation" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "partnership_manager" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "appointments_setter" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "strategic_funnel_stage" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "activation_date" timestamp;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "last_met_on" timestamp;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "meeting_scheduled_date_as" timestamp;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "meeting_date_pm" timestamp;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "partners_id" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "partnership_level" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "agreement_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "agreement_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "sales_training_done" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "date_of_birth" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "secondary_email" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "email_opt_out" boolean DEFAULT false;