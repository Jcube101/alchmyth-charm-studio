import { createFileRoute } from "@tanstack/react-router";
import { razorpayPaymentSchema, verifyRazorpayPayment } from "@/lib/razorpay.server";

export const Route = createFileRoute("/api/razorpay/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input = razorpayPaymentSchema.parse(await request.json());
          return Response.json(verifyRazorpayPayment(input));
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Payment verification failed." },
            { status: 400 },
          );
        }
      },
    },
  },
});
