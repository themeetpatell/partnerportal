ALTER TABLE "payout_requests" ADD COLUMN "commission_id" uuid;
--> statement-breakpoint
UPDATE "payout_requests"
SET "commission_id" = (
  SELECT "id"
  FROM "commissions"
  WHERE "commissions"."partner_id" = "payout_requests"."partner_id"
  ORDER BY "commissions"."created_at" DESC
  LIMIT 1
);
--> statement-breakpoint
ALTER TABLE "payout_requests" ALTER COLUMN "commission_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "payout_requests_commission_idx" ON "payout_requests" USING btree ("commission_id");
--> statement-breakpoint
CREATE INDEX "payout_requests_partner_status_idx" ON "payout_requests" USING btree ("partner_id","status");
