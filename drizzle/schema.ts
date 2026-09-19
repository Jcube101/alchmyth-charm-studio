import { bigint, check, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const quotes = pgTable(
  "quotes",
  {
    quoteId: text("quote_id").primaryKey(),
    payload: jsonb("payload").notNull(),
    customer: jsonb("customer").notNull().default({}),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
    submittedAt: text("submitted_at"),
    lastError: text("last_error"),
    submissionClaimedAt: text("submission_claimed_at"),
    submissionClaimToken: uuid("submission_claim_token"),
  },
  (table) => [
    check(
      "quotes_status_check",
      sql`${table.status} in ('generated', 'pending_approval', 'approved', 'rejected', 'sent', 'delivery_failed')`,
    ),
  ],
);

export const quoteSubmitLimits = pgTable(
  "quote_submit_limits",
  {
    limiterKey: text("limiter_key").primaryKey(),
    windowStartedAt: bigint("window_started_at", { mode: "number" }).notNull(),
    requestCount: integer("request_count").notNull(),
  },
  (table) => [check("quote_submit_limits_request_count_check", sql`${table.requestCount} >= 0`)],
);
