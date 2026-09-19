import { describe, expect, it } from "vitest";
import {
  claimQuoteSubmission,
  createQuote,
  getQuote,
  markDeliveryFailed,
  submitQuote,
  submittedPayload,
  updateQuoteStatus,
} from "./quotes.server";

const input = {
  product: "heartthrob-hotline",
  sku: "bag-charm" as const,
  mode: "bulk" as const,
  selection: {
    quantity: 30,
    charmCount: 0,
    customBranding: false,
    delivery: "standard" as const,
    sampleFirst: false,
    ownDesign: false,
  },
};
const customer = {
  name: "Test Customer",
  email: "customer@example.com",
  phone: null,
  company: null,
  gstin: null,
};

describe("quote submission persistence", () => {
  it("only lets the claim owner release a submission lease", () => {
    const quote = createQuote(input, "https://example.com");
    const token = claimQuoteSubmission(quote.quote_id);

    expect(token).toBeTruthy();
    expect(claimQuoteSubmission(quote.quote_id)).toBeNull();

    markDeliveryFailed(quote.quote_id, "not-the-owner", "ignored");
    expect(claimQuoteSubmission(quote.quote_id)).toBeNull();

    markDeliveryFailed(quote.quote_id, token!, "delivery failed");
    expect(claimQuoteSubmission(quote.quote_id)).toBeTruthy();
  });

  it("preserves an approval callback that arrives before submission finalizes", () => {
    const quote = createQuote(input, "https://example.com");
    const token = claimQuoteSubmission(quote.quote_id);
    expect(token).toBeTruthy();

    updateQuoteStatus(quote.quote_id, "approved");
    const payload = submittedPayload(quote, customer);
    const updated = submitQuote(quote.quote_id, customer, payload, token!);

    expect(updated?.status).toBe("approved");
    expect(getQuote(quote.quote_id)?.submitted_at).toBe(payload.submitted_at);
  });
});
