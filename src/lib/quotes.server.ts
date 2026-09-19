import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
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

async function database() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const id = () => `ALC-${Math.floor(100000 + Math.random() * 900000)}`;

function recordFromRow(value: {
  quote_id: string;
  payload: Json;
  customer: Json;
  status: string;
  created_at: string;
  submitted_at: string | null;
  last_error: string | null;
  submission_claimed_at: string | null;
  submission_claim_token: string | null;
}): QuoteRecord {
  return {
    ...value,
    payload: value.payload as unknown as QuotePayload,
    customer: value.customer as z.infer<typeof customerSchema>,
  };
}

export async function createQuote(input: z.infer<typeof quoteInputSchema>, origin: string) {
  const db = await database();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const quoteId = id();
    const payload = buildQuotePayload(input, quoteId, origin);
    const { error } = await db.from("quotes").insert({
      quote_id: quoteId,
      payload: payload as unknown as Json,
      customer: payload.customer as unknown as Json,
      status: "generated",
      created_at: payload.created_at,
    });
    if (!error) {
      console.info(`[quote] ${quoteId} generated`);
      return payload;
    }
    if (error.code !== "23505") throw new Error("Unable to save quote");
  }
  throw new Error("Unable to generate a unique quote reference");
}

export async function getQuote(quoteId: string): Promise<QuoteRecord | null> {
  const db = await database();
  const { data, error } = await db.from("quotes").select("*").eq("quote_id", quoteId).maybeSingle();
  if (error) throw new Error("Unable to load quote");
  return data ? recordFromRow(data) : null;
}

export async function claimQuoteSubmission(quoteId: string) {
  const db = await database();
  const claimedAt = istTimestamp();
  const staleBefore = istTimestamp(new Date(Date.now() - 60_000));
  const { data, error } = await db.rpc("claim_quote_submission", {
    p_quote_id: quoteId,
    p_claimed_at: claimedAt,
    p_stale_before: staleBefore,
  });
  if (error) throw new Error("Unable to reserve quote submission");
  return data ?? null;
}

export async function checkQuoteSubmitRateLimit(key: string, now = Date.now()) {
  const db = await database();
  const { data, error } = await db.rpc("check_quote_submit_rate_limit", {
    p_key: key,
    p_now: now,
  });
  if (error) throw new Error("Unable to check quote submission limit");
  return data;
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

export async function submitQuote(
  quoteId: string,
  customer: z.infer<typeof customerSchema>,
  webhookPayload: SubmittedQuotePayload,
  claimToken: string,
) {
  const existing = await getQuote(quoteId);
  if (!existing) return null;
  if (existing.submitted_at) return existing;

  const nextStatus = ["approved", "rejected", "sent"].includes(existing.status)
    ? existing.status
    : "pending_approval";
  const db = await database();
  const { data, error } = await db
    .from("quotes")
    .update({
      payload: webhookPayload as unknown as Json,
      customer: customer as unknown as Json,
      submitted_at: webhookPayload.submitted_at,
      status: nextStatus,
      last_error: null,
      submission_claimed_at: null,
      submission_claim_token: null,
    })
    .eq("quote_id", quoteId)
    .eq("submission_claim_token", claimToken)
    .select("*")
    .maybeSingle();
  if (error) throw new Error("Unable to finalize quote submission");
  if (!data) return null;
  const updated = recordFromRow(data);
  console.info(`[quote] ${quoteId} -> ${updated.status}`);
  return updated;
}

export async function markDeliveryFailed(quoteId: string, claimToken: string, error: string) {
  if (!z.string().uuid().safeParse(claimToken).success) return;
  const db = await database();
  const { error: updateError } = await db
    .from("quotes")
    .update({
      status: "delivery_failed",
      last_error: error.slice(0, 200),
      submission_claimed_at: null,
      submission_claim_token: null,
    })
    .eq("quote_id", quoteId)
    .eq("submission_claim_token", claimToken);
  if (updateError) throw new Error("Unable to record quote delivery failure");
}

export async function updateQuoteStatus(
  quoteId: string,
  status: "approved" | "rejected" | "sent",
  _note?: string,
) {
  const existing = await getQuote(quoteId);
  if (!existing) return null;
  const allowed =
    existing.status === status ||
    ["generated", "delivery_failed", "pending_approval"].includes(existing.status) ||
    (existing.status === "approved" && status === "sent");
  if (!allowed) return existing;
  const db = await database();
  const { data, error } = await db
    .from("quotes")
    .update({ status })
    .eq("quote_id", quoteId)
    .select("*")
    .single();
  if (error) throw new Error("Unable to update quote status");
  console.info(`[quote] ${quoteId} -> ${status}`);
  return recordFromRow(data);
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