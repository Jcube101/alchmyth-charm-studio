import { z } from "zod";
import { getProduct } from "./catalog";
import { calculatePrice, type OrderMode, type PricingSelection, type PricingSku } from "./pricing";

export const quoteInputSchema = z.object({
  product: z.string().min(1),
  sku: z.literal("bag-charm"),
  mode: z.enum(["custom", "bulk"]),
  selection: z.object({
    quantity: z.number().finite(),
    charmCount: z.number().int().min(0).max(3),
    customBranding: z.boolean(),
    delivery: z.enum(["standard", "express"]),
    sampleFirst: z.boolean(),
    ownDesign: z.boolean(),
  }),
});

export const customerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(120).optional().nullable(),
  gstin: z.string().trim().max(30).optional().nullable(),
});

const configuredTaxMode = process.env["TAX_MODE"];
const configuredGstRate = Number(process.env["GST_RATE"] ?? 0);
export const taxConfig = {
  mode: (["none", "inclusive", "exclusive"].includes(configuredTaxMode ?? "")
    ? configuredTaxMode
    : "none") as "none" | "inclusive" | "exclusive",
  gstRate:
    Number.isFinite(configuredGstRate) && configuredGstRate >= 0 && configuredGstRate <= 100
      ? configuredGstRate
      : 0,
};

export const istTimestamp = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((values, part) => {
      values[part.type] = part.value;
      return values;
    }, {});
  return `${parts["year"]}-${parts["month"]}-${parts["day"]}T${parts["hour"]}:${parts["minute"]}:${parts["second"]}+05:30`;
};

const istDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export function buildQuotePayload(
  input: z.infer<typeof quoteInputSchema>,
  quoteId: string,
  origin: string,
  now = new Date(),
) {
  const product = getProduct(input.product);
  if (!product || product.pricingSku !== input.sku) throw new Error("Unknown product");

  const result = calculatePrice(
    input.sku as PricingSku,
    input.mode as OrderMode,
    input.selection as PricingSelection,
  );
  const quotedTotal = result.total * 100;
  const inclusiveTax =
    taxConfig.mode === "inclusive" && taxConfig.gstRate > 0
      ? Math.round(quotedTotal - quotedTotal / (1 + taxConfig.gstRate / 100))
      : null;
  const subtotal = inclusiveTax === null ? quotedTotal : quotedTotal - inclusiveTax;
  const tax =
    taxConfig.mode === "exclusive" && taxConfig.gstRate > 0
      ? Math.round((subtotal * taxConfig.gstRate) / 100)
      : inclusiveTax;
  const total = taxConfig.mode === "exclusive" ? subtotal + (tax ?? 0) : quotedTotal;

  return {
    event: "quote.generated" as const,
    quote_id: quoteId,
    created_at: istTimestamp(now),
    submitted_at: null,
    valid_until: istDate(new Date(now.getTime() + 7 * 86_400_000)),
    currency: "INR" as const,
    product: {
      name: product.name,
      design: input.selection.ownDesign ? "customer" : "catalogue",
    },
    order_type: input.mode,
    quantity: result.quantity,
    options: {
      custom_charms: input.selection.charmCount
        ? [`${input.selection.charmCount} charm${input.selection.charmCount > 1 ? "s" : ""}`]
        : [],
      branding: input.selection.customBranding ? "Custom branding" : null,
      delivery: input.selection.delivery,
      sample: input.selection.sampleFirst,
    },
    line_items: result.lineItems.map((item) => ({
      description: item.label,
      qty: item.kind === "per-unit" ? result.quantity : 1,
      unit_price: Math.round(item.amount * 100),
      amount: Math.round(item.amount * 100) * (item.kind === "per-unit" ? result.quantity : 1),
    })),
    pricing: { unit_price: result.unitPrice * 100, subtotal, tax, total },
    terms: {
      advance_percent: 50,
      advance_amount: Math.round(total / 2),
      validity_days: 7,
    },
    customer: { name: "", email: "", phone: null, company: null, gstin: null },
    callback_url: `${origin.replace(/\/$/, "")}/api/quotes/${quoteId}/status`,
  };
}

export type QuotePayload = ReturnType<typeof buildQuotePayload>;
export type SubmittedQuotePayload = Omit<QuotePayload, "event" | "submitted_at" | "customer"> & {
  event: "quote.submitted";
  submitted_at: string;
  customer: z.infer<typeof customerSchema>;
};
