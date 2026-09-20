import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getPaidOrderConfirmation } from "@/lib/razorpay.server";

const referenceSchema = z.string().regex(/^ALC-[A-F0-9]{32}$/);

export async function orderConfirmationResponse(
  reference: string,
  getConfirmation: typeof getPaidOrderConfirmation = getPaidOrderConfirmation,
) {
  const parsed = referenceSchema.safeParse(reference);
  if (!parsed.success)
    return Response.json({ error: "Order confirmation was not found." }, { status: 404 });
  const order = await getConfirmation(parsed.data);
  if (!order) return Response.json({ error: "Order confirmation was not found." }, { status: 404 });
  return Response.json({ order });
}

export const Route = createFileRoute("/api/orders/$reference")({
  server: {
    handlers: {
      GET: ({ params }) => orderConfirmationResponse(params.reference),
    },
  },
});
