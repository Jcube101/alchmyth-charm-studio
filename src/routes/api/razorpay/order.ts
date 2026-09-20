import { createFileRoute } from "@tanstack/react-router";
import {
  createRazorpayOrder,
  razorpayCartSchema,
  razorpayErrorStatus,
} from "@/lib/razorpay.server";

export const Route = createFileRoute("/api/razorpay/order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input = razorpayCartSchema.parse(await request.json());
          return Response.json(await createRazorpayOrder(input));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "The test payment could not start.";
          return Response.json({ error: message }, { status: razorpayErrorStatus(error) });
        }
      },
    },
  },
});
