import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getProduct } from "@/lib/catalog";

export const razorpayCartSchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        quantity: z.number().int().min(1).max(1000),
      }),
    )
    .min(1)
    .max(50),
});

export const razorpayPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().regex(/^[a-f0-9]{64}$/i),
});

function credentials() {
  const keyId = process.env["RAZORPAY_KEY_ID"]?.trim();
  const keySecret = process.env["RAZORPAY_KEY_SECRET"]?.trim();
  if (!keyId || !keySecret) throw new Error("Razorpay test checkout is not configured yet.");
  return { keyId, keySecret };
}

export async function createRazorpayOrder(input: z.infer<typeof razorpayCartSchema>) {
  const data = razorpayCartSchema.parse(input);
  const { keyId, keySecret } = credentials();
  const amount = data.items.reduce((sum, item) => {
    const product = getProduct(item.slug);
    if (!product || product.outOfStock) throw new Error("One or more cart items are unavailable.");
    return sum + product.price * item.quantity;
  }, 0);
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `alc_${Date.now()}`,
      notes: { channel: "ready-made-cart" },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`Razorpay order creation failed [${response.status}]: ${body.slice(0, 500)}`);
    if (response.status === 401)
      throw new Error(
        "Razorpay rejected the test credentials. Check that both keys are from the same test-mode account.",
      );
    throw new Error("Razorpay could not start the test payment. Please try again.");
  }
  const order = z
    .object({ id: z.string(), amount: z.number(), currency: z.string() })
    .parse(await response.json());
  return { keyId, orderId: order.id, amount: order.amount, currency: order.currency };
}

export function verifyRazorpayPayment(input: z.infer<typeof razorpayPaymentSchema>) {
  const data = razorpayPaymentSchema.parse(input);
  const { keySecret } = credentials();
  const expected = createHmac("sha256", keySecret)
    .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
    .digest("hex");
  const supplied = Buffer.from(data.razorpaySignature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer))
    throw new Error("Payment verification failed.");
  return { verified: true, paymentId: data.razorpayPaymentId };
}
