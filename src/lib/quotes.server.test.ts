import { describe, expect, it } from "vitest";
import { submittedPayload } from "./quotes.server";
import { buildQuotePayload, customerSchema, quoteInputSchema } from "./quote-payload";

const bulkInput = {
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

describe("canonical quote payload", () => {
  it("recomputes the documented minimum quote in paise", () => {
    const payload = buildQuotePayload(
      bulkInput,
      "ALC-206371",
      "https://example.com",
      new Date("2026-09-19T06:30:00.000Z"),
    );

    expect(payload.quote_id).toBe("ALC-206371");
    expect(payload.created_at).toBe("2026-09-19T12:00:00+05:30");
    expect(payload.valid_until).toBe("2026-09-26");
    expect(payload.pricing).toEqual({
      unit_price: 162_000,
      subtotal: 4_860_000,
      tax: null,
      total: 4_860_000,
    });
    expect(payload.terms).toEqual({
      advance_percent: 50,
      advance_amount: 2_430_000,
      validity_days: 7,
    });
    expect(payload.callback_url).toBe("https://example.com/api/quotes/ALC-206371/status");
  });

  it("creates separate add-on rows from server pricing", () => {
    const payload = buildQuotePayload(
      {
        ...bulkInput,
        selection: {
          ...bulkInput.selection,
          quantity: 100,
          charmCount: 2,
          customBranding: true,
          delivery: "express",
          sampleFirst: true,
        },
      },
      "ALC-206372",
      "https://example.com/",
    );

    expect(payload.pricing.total).toBe(19_475_000);
    expect(payload.line_items.map((item) => item.description)).toEqual([
      "Base price",
      "15% volume discount",
      "2 charms",
      "Custom branding (e.g. a flag)",
      "Express delivery (10%)",
      "Paid sample first",
    ]);
  });

  it("adds a self-contained, HTML-safe invoice to submitted webhooks", () => {
    const quote = buildQuotePayload(bulkInput, "ALC-206371", "https://example.com");
    const submitted = submittedPayload(quote, {
      name: "<script>alert('x')</script>",
      email: "demo@example.com",
      phone: null,
      company: "Charm & Co.",
      gstin: null,
    });

    expect(submitted.pdf_filename).toBe("Quote-ALC-206371.pdf");
    expect(submitted.invoice_html).toContain("<!doctype html>");
    expect(submitted.invoice_html).toContain("₹48,600");
    expect(submitted.invoice_html).toContain("&lt;script&gt;");
    expect(submitted.invoice_html).toContain("Charm &amp; Co.");
    expect(submitted.invoice_html).not.toContain("<script>alert");
    expect(submitted.invoice_html).not.toContain("https://");
  });
});

describe("quote API validation", () => {
  it("rejects unsupported order modes and malformed customers", () => {
    expect(quoteInputSchema.safeParse({ ...bulkInput, mode: "ready" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "", email: "not-an-email" }).success).toBe(false);
  });
});
