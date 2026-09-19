import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { z } from "zod";
import {
  buildQuotePayload,
  customerSchema,
  istTimestamp,
  quoteInputSchema,
  type QuotePayload,
  type SubmittedQuotePayload,
} from "./quote-payload";
export { buildQuotePayload, customerSchema, quoteInputSchema } from "./quote-payload";
export type QuoteRecord = {
  quote_id: string;
  payload: QuotePayload;
  customer: z.infer<typeof customerSchema>;
  status: string;
  created_at: string;
  submitted_at: string | null;
  last_error: string | null;
  submission_claimed_at: string | null;
  submission_claim_token: string | null;
};

const dbPath = ".data/quotes.sqlite";
mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.exec(`CREATE TABLE IF NOT EXISTS quotes (
  quote_id TEXT PRIMARY KEY, payload TEXT NOT NULL, customer TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL, submitted_at TEXT, last_error TEXT,
  submission_claimed_at TEXT, submission_claim_token TEXT
)`);
const columns = db.prepare("PRAGMA table_info(quotes)").all() as Array<{ name: string }>;
if (!columns.some((column) => column.name === "submission_claimed_at")) {
  db.exec("ALTER TABLE quotes ADD COLUMN submission_claimed_at TEXT");
}
if (!columns.some((column) => column.name === "submission_claim_token")) {
  db.exec("ALTER TABLE quotes ADD COLUMN submission_claim_token TEXT");
}
db.exec(`CREATE TABLE IF NOT EXISTS quote_submit_limits (
  limiter_key TEXT PRIMARY KEY, window_started_at INTEGER NOT NULL, request_count INTEGER NOT NULL
)`);

const id = () => `ALC-${Math.floor(100000 + Math.random() * 900000)}`;

export function createQuote(input: z.infer<typeof quoteInputSchema>, origin: string) {
  let quoteId = id();
  while (db.prepare("SELECT quote_id FROM quotes WHERE quote_id = ?").get(quoteId)) quoteId = id();
  const payload = buildQuotePayload(input, quoteId, origin);
  db.prepare(
    `INSERT INTO quotes
      (quote_id, payload, customer, status, created_at, submitted_at, last_error, submission_claimed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    quoteId,
    JSON.stringify(payload),
    JSON.stringify(payload.customer),
    "generated",
    payload.created_at,
    null,
    null,
    null,
  );
  console.info(`[quote] ${quoteId} generated`);
  return payload;
}
function row(quoteId: string): QuoteRecord | null {
  const value = db.prepare("SELECT * FROM quotes WHERE quote_id = ?").get(quoteId) as Record<
    string,
    string
  > | null;
  if (!value) return null;
  return {
    quote_id: value["quote_id"]!,
    payload: JSON.parse(value["payload"]!),
    customer: JSON.parse(value["customer"]!),
    status: value["status"]!,
    created_at: value["created_at"]!,
    submitted_at: value["submitted_at"] ?? null,
    last_error: value["last_error"] ?? null,
    submission_claimed_at: value["submission_claimed_at"] ?? null,
    submission_claim_token: value["submission_claim_token"] ?? null,
  };
}
export const getQuote = row;
export function claimQuoteSubmission(quoteId: string) {
  const token = randomUUID();
  const claimedAt = istTimestamp();
  const staleBefore = istTimestamp(new Date(Date.now() - 60_000));
  const result = db
    .prepare(
      `UPDATE quotes
       SET submission_claimed_at = ?, submission_claim_token = ?
       WHERE quote_id = ?
         AND submitted_at IS NULL
         AND (submission_claimed_at IS NULL OR submission_claimed_at < ?)`,
    )
    .run(claimedAt, token, quoteId, staleBefore);
  return result.changes === 1 ? token : null;
}
export function checkQuoteSubmitRateLimit(key: string, now = Date.now()) {
  const windowMs = 60_000;
  const current = db
    .prepare(
      "SELECT window_started_at, request_count FROM quote_submit_limits WHERE limiter_key = ?",
    )
    .get(key) as { window_started_at: number; request_count: number } | undefined;
  if (!current || now - current.window_started_at >= windowMs) {
    db.prepare(
      `INSERT INTO quote_submit_limits (limiter_key, window_started_at, request_count)
       VALUES (?, ?, 1)
       ON CONFLICT(limiter_key) DO UPDATE SET window_started_at = excluded.window_started_at, request_count = 1`,
    ).run(key, now);
    return true;
  }
  if (current.request_count >= 10) return false;
  db.prepare(
    "UPDATE quote_submit_limits SET request_count = request_count + 1 WHERE limiter_key = ?",
  ).run(key);
  return true;
}
export function submittedPayload(
  webhookPayload: QuotePayload,
  customer: z.infer<typeof customerSchema>,
) {
  return {
    ...webhookPayload,
    event: "quote.submitted" as const,
    submitted_at: istTimestamp(),
    customer,
  };
}
export function submitQuote(
  quoteId: string,
  customer: z.infer<typeof customerSchema>,
  webhookPayload: SubmittedQuotePayload,
  claimToken: string,
) {
  const existing = row(quoteId);
  if (!existing) return null;
  if (existing.submitted_at) return existing;
  const result = db
    .prepare(
      `UPDATE quotes SET payload = ?, customer = ?, submitted_at = ?,
      status = CASE WHEN status IN ('approved', 'rejected', 'sent') THEN status ELSE 'pending_approval' END,
      last_error = NULL, submission_claimed_at = NULL, submission_claim_token = NULL
      WHERE quote_id = ? AND submission_claim_token = ?`,
    )
    .run(
      JSON.stringify(webhookPayload),
      JSON.stringify(customer),
      webhookPayload.submitted_at,
      quoteId,
      claimToken,
    );
  if (result.changes !== 1) return null;
  const updated = row(quoteId);
  console.info(`[quote] ${quoteId} -> ${updated?.status ?? "pending_approval"}`);
  return updated;
}
export function markDeliveryFailed(quoteId: string, claimToken: string, error: string) {
  db.prepare(
    `UPDATE quotes SET status = 'delivery_failed', last_error = ?,
      submission_claimed_at = NULL, submission_claim_token = NULL
      WHERE quote_id = ? AND submission_claim_token = ?`,
  ).run(error.slice(0, 200), quoteId, claimToken);
}
export function updateQuoteStatus(
  quoteId: string,
  status: "approved" | "rejected" | "sent",
  _note?: string,
) {
  const existing = row(quoteId);
  if (!existing) return null;
  const allowed =
    existing.status === status ||
    ["generated", "delivery_failed", "pending_approval"].includes(existing.status) ||
    (existing.status === "approved" && status === "sent");
  if (!allowed) return existing;
  db.prepare("UPDATE quotes SET status = ? WHERE quote_id = ?").run(status, quoteId);
  console.info(`[quote] ${quoteId} -> ${status}`);
  return row(quoteId);
}
export function publicQuote(record: QuoteRecord) {
  return {
    quote_id: record.quote_id,
    payload: {
      ...record.payload,
      customer: { name: "", email: "", phone: null, company: null, gstin: null },
    },
    status: record.status,
    created_at: record.created_at,
    submitted_at: record.submitted_at,
  };
}
