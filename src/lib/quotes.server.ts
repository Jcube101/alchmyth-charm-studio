import { z } from "zod";
import { buildInvoiceHtml } from "./quote-invoice.server";
import {
  claimSubmission,
  consumeSubmitRateLimit,
  failDelivery,
  finalizeSubmission,
  findQuote,
  insertQuote,
  setQuoteStatus,
  type StoredQuoteRow,
} from "./quote-store.server";
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

const id = () => `ALC-${Math.floor(100000 + Math.random() * 900000)}`;

function recordFromRow(value: StoredQuoteRow): QuoteRecord {
  return {
    quote_id: value.quoteId,
    payload: value.payload as unknown as QuotePayload,
    customer: value.customer as z.infer<typeof customerSchema>,
    status: value.status,
    created_at: value.createdAt,
    submitted_at: value.submittedAt,
    last_error: value.lastError,
    submission_claimed_at: value.submissionClaimedAt,
    submission_claim_token: value.submissionClaimToken,
  };
}

export async function createQuote(input: z.infer<typeof quoteInputSchema>, origin: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const quoteId = id();
    const payload = buildQuotePayload(input, quoteId, origin);
    const inserted = await insertQuote({
      quoteId,
      payload,
      customer: payload.customer,
      status: "generated",
      createdAt: payload.created_at,
    });
    if (inserted) {
      console.info(`[quote] ${quoteId} generated`);
      return payload;
    }
  }
  throw new Error("Unable to generate a unique quote reference");
}

export async function getQuote(quoteId: string): Promise<QuoteRecord | null> {
  const data = await findQuote(quoteId);
  return data ? recordFromRow(data) : null;
}

export async function claimQuoteSubmission(quoteId: string) {
  const claimedAt = istTimestamp();
  const staleBefore = istTimestamp(new Date(Date.now() - 60_000));
  return claimSubmission(quoteId, claimedAt, staleBefore);
}

export async function checkQuoteSubmitRateLimit(key: string, now = Date.now()) {
  return consumeSubmitRateLimit(key, now);
}

export function submittedPayload(
  webhookPayload: QuotePayload,
  customer: z.infer<typeof customerSchema>,
) {
  const submitted = {
    ...webhookPayload,
    event: "quote.submitted" as const,
    submitted_at: istTimestamp(),
    customer,
  };
  return {
    ...submitted,
    invoice_html: buildInvoiceHtml(submitted),
    pdf_filename: `Quote-${webhookPayload.quote_id}.pdf`,
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
  const data = await finalizeSubmission(quoteId, claimToken, {
    payload: webhookPayload,
    customer,
    submittedAt: webhookPayload.submitted_at,
    status: nextStatus,
    lastError: null,
    submissionClaimedAt: null,
    submissionClaimToken: null,
  });
  if (!data) return null;
  const updated = recordFromRow(data);
  console.info(`[quote] ${quoteId} -> ${updated.status}`);
  return updated;
}

export async function markDeliveryFailed(quoteId: string, claimToken: string, error: string) {
  if (!z.string().uuid().safeParse(claimToken).success) return;
  await failDelivery(quoteId, claimToken, error);
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
  const data = await setQuoteStatus(quoteId, status);
  if (!data) return null;
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
