import { createFileRoute } from "@tanstack/react-router";
import { getQuote, publicQuote } from "@/lib/quotes.server";

export const Route = createFileRoute("/api/quotes/$quoteId")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const quote = getQuote(params.quoteId);
        return quote
          ? Response.json(publicQuote(quote))
          : Response.json({ error: "Quote not found" }, { status: 404 });
      },
    },
  },
});
