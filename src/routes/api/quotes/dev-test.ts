import { createFileRoute } from "@tanstack/react-router";
import { buildQuotePayload, submittedPayload } from "@/lib/quotes.server";
import { sendWebhook } from "./$quoteId/submit";
export const Route = createFileRoute("/api/quotes/dev-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env["NODE_ENV"] === "production")
          return Response.json({ error: "Not available" }, { status: 404 });
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
        await sendWebhook(
          submittedPayload(payload, {
            name: "Dev Test",
            email: "dev-test@example.invalid",
            phone: null,
            company: null,
            gstin: null,
          }),
        );
        return Response.json({ ok: true });
      },
    },
  },
});
