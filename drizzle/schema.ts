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

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reference: text("reference").notNull().unique(),
    status: text("status").notNull().default("pending"),
    fulfillmentStatus: text("fulfillment_status").notNull().default("not_ready"),
    items: jsonb("items").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    razorpayOrderId: text("razorpay_order_id").unique(),
    razorpayPaymentId: text("razorpay_payment_id").unique(),
    providerPaymentStatus: text("provider_payment_status"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    paidAt: text("paid_at"),
    lastError: text("last_error"),
  },
  (table) => [
    check("orders_status_check", sql`${table.status} in ('pending', 'paid')`),
    check(
      "orders_fulfillment_status_check",
      sql`${table.fulfillmentStatus} in ('not_ready', 'unfulfilled', 'fulfilled')`,
    ),
    check("orders_amount_check", sql`${table.amount} > 0`),
    check("orders_currency_check", sql`${table.currency} = 'INR'`),
    check(
      "orders_paid_state_check",
      sql`(${table.status} = 'pending' and ${table.paidAt} is null and ${table.razorpayPaymentId} is null and ${table.providerPaymentStatus} is null and ${table.fulfillmentStatus} = 'not_ready') or (${table.status} = 'paid' and ${table.paidAt} is not null and ${table.razorpayOrderId} is not null and ${table.razorpayPaymentId} is not null and ${table.providerPaymentStatus} = 'captured' and ${table.fulfillmentStatus} in ('unfulfilled', 'fulfilled'))`,
    ),
  ],
);
