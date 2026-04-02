ALTER TABLE "documents" ADD COLUMN "storage_provider" text DEFAULT 'workdrive' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "file_data_base64" text;