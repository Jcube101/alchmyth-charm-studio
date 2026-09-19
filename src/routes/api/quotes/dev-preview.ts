import { createFileRoute } from "@tanstack/react-router";
import { buildQuotePayload, submittedPayload } from "@/lib/quotes.server";

export const Route = createFileRoute("/api/quotes/dev-preview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const quote = buildQuotePayload(
          {
            product: "heartthrob-hotline",
            sku: "bag-charm",
            mode: "bulk",
            selection: {
              quantity: 30,
              charmCount: 0,
              customBranding: false,
              delivery: "standard",
              sampleFirst: false,
              ownDesign: false,
            },
          },
          "ALC-206371",
          new URL(request.url).origin,
          new Date("2026-09-19T06:30:00.000Z"),
        );
        const sample = submittedPayload(quote, {
          name: "Ananya Sharma",
          email: "ananya@example.com",
          phone: "+91 98765 43210",
          company: "Marigold Events",
          gstin: "27ABCDE1234F1Z5",
        });
        return new Response(sample.invoice_html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
