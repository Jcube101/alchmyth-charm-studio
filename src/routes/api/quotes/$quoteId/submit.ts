import { createFileRoute } from "@tanstack/react-router";
import {
  claimQuoteSubmission,
  checkQuoteSubmitRateLimit,
  customerSchema,
  getQuote,
  markDeliveryFailed,
  publicQuote,
  submittedPayload,
  submitQuote,
} from "@/lib/quotes.server";

export async function sendWebhook(payload: unknown) {
  const url =
    process.env["N8N_WEBHOOK_URL"] ??
    "https://n8n.job-joseph.com/webhook/8ae8e578-01e4-4ccc-89de-446a34bbf046";
  const secret = process.env["N8N_WEBHOOK_SECRET"];
  let lastError = "Webhook delivery failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(secret ? { "x-webhook-secret": secret } : {}),
          "idempotency-key":
            typeof payload === "object" &&
            payload !== null &&
            "quote_id" in payload &&
            typeof payload.quote_id === "string"
              ? payload.quote_id
              : "quote-dev-test",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) return;
      if (response.status < 500) throw new Error(`Webhook returned ${response.status}`);
      lastError = `Webhook returned ${response.status}`;
    } catch (error) {
      lastError =
        error instanceof Error && error.name === "TimeoutError"
          ? "Webhook timed out"
          : "Webhook network error";
      if (error instanceof Error && error.message.startsWith("Webhook returned 4")) throw error;
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
  }
  throw new Error(lastError);
}
export const Route = createFileRoute("/api/quotes/$quoteId/submit")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
        const clientIp =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-real-ip") ??
          forwarded ??
          "unknown";
        if (!(await checkQuoteSubmitRateLimit(`${clientIp}:${params.quoteId}`)))
          return Response.json({ error: "Too many requests" }, { status: 429 });
        const record = await getQuote(params.quoteId);
        if (!record) return Response.json({ error: "Quote not found" }, { status: 404 });
        const parsed = customerSchema.safeParse(await request.json());
        if (!parsed.success)
          return Response.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid customer details" },
            { status: 400 },
          );
        if (record.submitted_at) return Response.json(publicQuote(record));
        const claimToken = await claimQuoteSubmission(params.quoteId);
        if (!claimToken) {
          const latest = await getQuote(params.quoteId);
          if (latest?.submitted_at) return Response.json(publicQuote(latest));
          return Response.json(
            { error: "This quote is already being submitted. Please wait a moment." },
            { status: 409 },
          );
        }
        const payload = submittedPayload(record.payload, parsed.data);
        try {
          await sendWebhook(payload);
        } catch (error) {
          await markDeliveryFailed(
            params.quoteId,
            claimToken,
            error instanceof Error ? error.message : "Webhook delivery failed",
          );
          return Response.json(
            { error: "We couldn't send your quote yet. Please try again." },
            { status: 502 },
          );
        }
        const updated = await submitQuote(params.quoteId, parsed.data, payload, claimToken);
        return updated
          ? Response.json(publicQuote(updated))
          : Response.json(
              { error: "This submission was superseded. Please check the quote status." },
              { status: 409 },
            );
      },
    },
  },
});
