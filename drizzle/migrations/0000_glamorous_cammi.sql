CREATE TABLE "quote_submit_limits" (
	"limiter_key" text PRIMARY KEY NOT NULL,
	"window_started_at" bigint NOT NULL,
	"request_count" integer NOT NULL,
	CONSTRAINT "quote_submit_limits_request_count_check" CHECK ("quote_submit_limits"."request_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"quote_id" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"customer" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text NOT NULL,
	"created_at" text NOT NULL,
	"submitted_at" text,
	"last_error" text,
	"submission_claimed_at" text,
	"submission_claim_token" uuid,
	CONSTRAINT "quotes_status_check" CHECK ("quotes"."status" in ('generated', 'pending_approval', 'approved', 'rejected', 'sent', 'delivery_failed'))
);
