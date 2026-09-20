import { createFileRoute } from "@tanstack/react-router";
import { processRazorpayWebhook, razorpayErrorStatus } from "@/lib/razorpay.server";

export const Route = createFileRoute("/api/razorpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        try {
          const order = await processRazorpayWebhook(
            rawBody,
            request.headers.get("x-razorpay-signature"),
          );
          return Response.json({ received: true, order });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Webhook processing failed." },
            { status: razorpayErrorStatus(error) },
          );
        }
      },
    },
  },
});
