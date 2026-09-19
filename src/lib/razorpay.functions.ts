import { createHmac, timingSafeEqual } from "crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getProduct } from "@/lib/catalog";

const cartSchema = z.object({
  items: z.array(z.object({
    slug: z.string().min(1),
    quantity: z.number().int().min(1).max(1000),
  })).min(1).max(50),
});

const paymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().regex(/^[a-f0-9]{64}$/i),
});

function credentials() {
  const keyId = process.env['RAZORPAY_KEY_ID'];
  const keySecret = process.env['RAZORPAY_KEY_SECRET'];
  if (!keyId || !keySecret) throw new Error("Razorpay test checkout is not configured yet.");
  return { keyId, keySecret };
}

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => cartSchema.parse(input))
  .handler(async ({ data }) => {
    const { keyId, keySecret } = credentials();
    const amount = data.items.reduce((sum, item) => {
      const product = getProduct(item.slug);
      if (!product || product.outOfStock) throw new Error("One or more cart items are unavailable.");
      return sum + product.price * item.quantity;
    }, 0);
    const amountPaise = Math.round(amount * 100);
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: `alc_${Date.now()}`, notes: { channel: "ready-made-cart" } }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`Razorpay order creation failed [${response.status}]: ${body}`);
      throw new Error("Razorpay could not start the test payment. Please try again.");
    }
    const order = z.object({ id: z.string(), amount: z.number(), currency: z.string() }).parse(await response.json());
    return { keyId, orderId: order.id, amount: order.amount, currency: order.currency };
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .inputValidator((input) => paymentSchema.parse(input))
  .handler(async ({ data }) => {
    const { keySecret } = credentials();
    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest("hex");
    const suppliedBuffer = Buffer.from(data.razorpaySignature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const verified = suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
    if (!verified) throw new Error("Payment verification failed.");
    return { verified: true, paymentId: data.razorpayPaymentId };
  });
