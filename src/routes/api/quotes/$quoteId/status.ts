import { createFileRoute } from "@tanstack/react-router";
import { getQuote, publicQuote, updateQuoteStatus } from "@/lib/quotes.server";
export const Route = createFileRoute("/api/quotes/$quoteId/status")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const callbackSecret = process.env["QUOTE_CALLBACK_SECRET"];
        if (callbackSecret && request.headers.get("x-callback-secret") !== callbackSecret)
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        const body = (await request.json()) as {
          status?: "approved" | "rejected" | "sent";
          note?: string;
        };
        if (!body.status || !["approved", "rejected", "sent"].includes(body.status))
          return Response.json({ error: "Invalid status" }, { status: 400 });
        const updated = await updateQuoteStatus(params.quoteId, body.status, body.note);
        return updated
          ? Response.json(publicQuote(updated))
          : Response.json({ error: "Quote not found" }, { status: 404 });
      },
    },
  },
});
