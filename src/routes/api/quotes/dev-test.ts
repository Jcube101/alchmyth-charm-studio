import { createFileRoute } from "@tanstack/react-router";
import { buildQuotePayload } from "@/lib/quotes.server";
import { sendWebhook } from "./$quoteId/submit";
export const Route = createFileRoute("/api/quotes/dev-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env["NODE_ENV"] === "production")
          return Response.json({ error: "Not available" }, { status: 404 });
        const secret = process.env["N8N_WEBHOOK_SECRET"];
        if (!secret || request.headers.get("x-dev-secret") !== secret)
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (!process.env["N8N_WEBHOOK_URL"])
          return Response.json({ error: "Quote delivery is not configured" }, { status: 503 });
        const payload = buildQuotePayload(
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
          "ALC-000000",
          new URL(request.url).origin,
        );
        await sendWebhook({
          ...payload,
          event: "quote.submitted",
          submitted_at: payload.created_at,
          customer: {
            name: "Dev Test",
            email: "dev-test@example.invalid",
            phone: null,
            company: null,
            gstin: null,
          },
        });
        return Response.json({ ok: true });
      },
    },
  },
});
