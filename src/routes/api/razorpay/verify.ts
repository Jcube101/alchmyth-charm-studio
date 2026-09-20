import { createFileRoute } from "@tanstack/react-router";
import {
  razorpayErrorStatus,
  razorpayPaymentSchema,
  verifyRazorpayPayment,
} from "@/lib/razorpay.server";

export async function verifyPaymentRequest(
  request: Request,
  verify: typeof verifyRazorpayPayment = verifyRazorpayPayment,
) {
  try {
    const input = razorpayPaymentSchema.parse(await request.json());
    return Response.json(await verify(input));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Payment verification failed." },
      { status: razorpayErrorStatus(error) },
    );
  }
}

export const Route = createFileRoute("/api/razorpay/verify")({
  server: {
    handlers: {
      POST: ({ request }) => verifyPaymentRequest(request),
    },
  },
});
