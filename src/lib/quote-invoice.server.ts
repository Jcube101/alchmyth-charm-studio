import type { QuotePayload } from "./quote-payload";

type InvoiceQuote = Omit<QuotePayload, "event" | "submitted_at" | "customer"> & {
  event: "quote.generated" | "quote.submitted";
  submitted_at: string | null;
  customer: {
    name: string;
    email: string;
    phone?: string | null | undefined;
    company?: string | null | undefined;
    gstin?: string | null | undefined;
  };
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatRupees = (paise: number) => {
  const rupees = paise / 100;
  return `₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees)}`;
};

const formatDate = (value: string) => {
  const date = new Date(value.length === 10 ? `${value}T00:00:00+05:30` : value);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export function buildInvoiceHtml(quote: InvoiceQuote) {
  const customerLines = [
    quote.customer.name,
    quote.customer.email,
    quote.customer.phone,
    quote.customer.company,
    quote.customer.gstin ? `GSTIN: ${quote.customer.gstin}` : null,
  ]
    .filter(Boolean)
    .map((value) => `<div>${escapeHtml(value)}</div>`)
    .join("");
  const rows = quote.line_items
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.description)}</td>
        <td class="number">${escapeHtml(item.qty)}</td>
        <td class="number">${escapeHtml(formatRupees(item.unit_price))}</td>
        <td class="number">${escapeHtml(formatRupees(item.amount))}</td>
      </tr>`,
    )
    .join("");
  const taxRow =
    quote.pricing.tax === null
      ? ""
      : `<tr><th>Tax</th><td>${escapeHtml(formatRupees(quote.pricing.tax))}</td></tr>`;
  const validUntil = formatDate(quote.valid_until);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Quote ${escapeHtml(quote.quote_id)} — A Little Charm</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #efece0; color: #242424; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; }
    .page { width: 100%; max-width: 794px; min-height: 1123px; margin: 0 auto; padding: 54px; background: #fcfbf6; }
    .top { display: flex; justify-content: space-between; gap: 32px; padding-bottom: 28px; border-bottom: 2px solid #337348; }
    .brand { color: #337348; font-size: 17px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
    h1 { margin: 7px 0 0; font-size: 42px; line-height: 1; font-weight: 500; }
    .meta { text-align: right; }
    .meta strong { display: block; font-size: 16px; }
    .meta span { color: #6b6a64; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 34px 0; }
    .label { margin-bottom: 8px; color: #6b6a64; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .prepared { padding: 18px; border-left: 4px solid #dc6b9c; background: #f7edf0; }
    table { width: 100%; border-collapse: collapse; }
    th { color: #5a5954; font-size: 11px; letter-spacing: .08em; text-align: left; text-transform: uppercase; }
    .items th { padding: 12px 10px; border-bottom: 2px solid #337348; }
    .items td { padding: 14px 10px; border-bottom: 1px solid #d4d0c3; }
    .number { text-align: right; white-space: nowrap; }
    .totals { width: 310px; margin: 28px 0 0 auto; }
    .totals th, .totals td { padding: 7px 4px; }
    .totals td { text-align: right; font-weight: 600; }
    .total th, .total td { padding-top: 12px; border-top: 2px solid #242424; color: #337348; font-size: 18px; }
    .advance th, .advance td { padding: 12px 4px; border-top: 1px solid #d4d0c3; font-weight: 800; }
    footer { margin-top: 54px; padding-top: 18px; border-top: 1px solid #d4d0c3; color: #6b6a64; font-size: 12px; }
    @media print { body { background: white; } .page { min-height: auto; margin: 0; padding: 0; } }
  </style>
</head>
<body>
  <main class="page">
    <header class="top">
      <div><div class="brand">A Little Charm</div><h1>Quote</h1></div>
      <div class="meta"><strong>${escapeHtml(quote.quote_id)}</strong><span>Created ${escapeHtml(formatDate(quote.created_at))}<br>Valid until ${escapeHtml(validUntil)}</span></div>
    </header>
    <section class="details">
      <div><div class="label">Prepared for</div><div class="prepared">${customerLines}</div></div>
      <div><div class="label">Quote details</div><strong>${escapeHtml(quote.product.name)}</strong><div>${escapeHtml(quote.quantity)} units · ${escapeHtml(quote.order_type)} order</div></div>
    </section>
    <table class="items">
      <thead><tr><th>Description</th><th class="number">Qty</th><th class="number">Unit price</th><th class="number">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="totals">
      <tr><th>Subtotal</th><td>${escapeHtml(formatRupees(quote.pricing.subtotal))}</td></tr>
      ${taxRow}
      <tr class="total"><th>Total</th><td>${escapeHtml(formatRupees(quote.pricing.total))}</td></tr>
      <tr class="advance"><th>Advance to confirm (${escapeHtml(quote.terms.advance_percent)}%)</th><td>${escapeHtml(formatRupees(quote.terms.advance_amount))}</td></tr>
    </table>
    <footer>Quote valid until ${escapeHtml(validUntil)}. ${escapeHtml(quote.terms.advance_percent)}% advance to confirm.</footer>
  </main>
</body>
</html>`;
}
