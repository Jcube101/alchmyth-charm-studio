import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getProduct } from "@/lib/catalog";
import {
  attachRazorpayOrder,
  findOrderByRazorpayOrderId,
  findOrderByReference,
  insertPendingOrder,
  markOrderPaid,
  OrderConflictError,
  OrderPersistenceError,
  recordOrderError,
  type OrderItemSnapshot,
  type StoredOrder,
} from "@/lib/order-store.server";

const CURRENCY = "INR";

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

const providerOrderSchema = z.object({
  id: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string(),
  status: z.string(),
});

const providerPaymentSchema = z.object({
  id: z.string().min(1),
  order_id: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string(),
  status: z.string(),
});

const webhookSchema = z.object({
  event: z.literal("payment.captured"),
  payload: z.object({
    payment: z.object({
      entity: providerPaymentSchema,
    }),
  }),
});

export class PaymentValidationError extends Error {
  constructor(message = "Payment verification failed.") {
    super(message);
    this.name = "PaymentValidationError";
  }
}

export class PaymentNotFoundError extends Error {
  constructor(message = "Payment order was not found.") {
    super(message);
    this.name = "PaymentNotFoundError";
  }
}

export class PaymentProviderError extends Error {
  constructor(message = "Razorpay could not confirm the payment. Please try again.") {
    super(message);
    this.name = "PaymentProviderError";
  }
}

function credentials() {
  const keyId = process.env["RAZORPAY_KEY_ID"]?.trim();
  const keySecret = process.env["RAZORPAY_KEY_SECRET"]?.trim();
  if (!keyId || !keySecret) throw new PaymentProviderError("Razorpay checkout is not configured.");
  return { keyId, keySecret };
}

function webhookSecret() {
  const secret =
    process.env["RAZORPAY_WEBHOOK_SECRET"]?.trim() ?? process.env["RAZORPAY_KEY_SECRET"]?.trim();
  if (!secret) throw new PaymentProviderError("Razorpay webhook verification is not configured.");
  return secret;
}

function safeSignatureMatches(payload: string, suppliedSignature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(suppliedSignature)) return false;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const supplied = Buffer.from(suppliedSignature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function orderReference() {
  return `ALC-${randomBytes(16).toString("hex").toUpperCase()}`;
}

function snapshotCart(input: z.infer<typeof razorpayCartSchema>) {
  const data = razorpayCartSchema.parse(input);
  const items: OrderItemSnapshot[] = data.items.map((item) => {
    const product = getProduct(item.slug);
    if (!product || product.outOfStock)
      throw new PaymentValidationError("Cart item is unavailable.");
    const unitAmount = Math.round(product.price * 100);
    return {
      slug: product.slug,
      name: product.name,
      quantity: item.quantity,
      unitAmount,
      lineAmount: unitAmount * item.quantity,
    };
  });
  return {
    items,
    amount: items.reduce((sum, item) => sum + item.lineAmount, 0),
    currency: CURRENCY,
  };
}

async function providerRequest(path: string, init?: RequestInit) {
  const { keyId, keySecret } = credentials();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "content-type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`Razorpay API failed [${response.status}]: ${body.slice(0, 500)}`);
    if (response.status === 401)
      throw new PaymentProviderError("Razorpay rejected the configured credentials.");
    throw new PaymentProviderError();
  }
  return response.json();
}

function publicConfirmation(order: StoredOrder) {
  return {
    reference: order.reference,
    status: order.status,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    amount: order.amount,
    currency: order.currency,
  };
}

export async function createRazorpayOrder(input: z.infer<typeof razorpayCartSchema>) {
  const snapshot = snapshotCart(input);
  const { keyId } = credentials();
  const now = new Date().toISOString();
  const pending = await insertPendingOrder({
    reference: orderReference(),
    status: "pending",
    fulfillmentStatus: "not_ready",
    items: snapshot.items,
    amount: snapshot.amount,
    currency: snapshot.currency,
    createdAt: now,
    updatedAt: now,
  });

  try {
    const providerOrder = providerOrderSchema.parse(
      await providerRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          amount: pending.amount,
          currency: pending.currency,
          receipt: pending.reference,
          notes: { channel: "ready-made-cart", reference: pending.reference },
        }),
      }),
    );
    if (providerOrder.amount !== pending.amount || providerOrder.currency !== pending.currency)
      throw new PaymentValidationError("Razorpay returned mismatched order totals.");
    if (providerOrder.status !== "created")
      throw new PaymentValidationError("Razorpay returned an invalid order status.");
    const attached = await attachRazorpayOrder(
      pending.id,
      providerOrder.id,
      new Date().toISOString(),
    );
    if (!attached) throw new OrderConflictError("Pending order could not be associated.");
    return {
      keyId,
      orderId: providerOrder.id,
      amount: attached.amount,
      currency: attached.currency,
      reference: attached.reference,
    };
  } catch (error) {
    await recordOrderError(
      pending.id,
      error instanceof Error ? error.message : "Razorpay order creation failed.",
      new Date().toISOString(),
    ).catch(() => undefined);
    throw error;
  }
}

async function settleRazorpayPayment(razorpayOrderId: string, razorpayPaymentId: string) {
  const order = await findOrderByRazorpayOrderId(razorpayOrderId);
  if (!order) throw new PaymentNotFoundError();
  if (order.status === "paid") {
    if (order.razorpayPaymentId !== razorpayPaymentId) throw new OrderConflictError();
    return publicConfirmation(order);
  }

  const [payment, providerOrder] = await Promise.all([
    providerRequest(`/payments/${encodeURIComponent(razorpayPaymentId)}`).then((value) =>
      providerPaymentSchema.parse(value),
    ),
    providerRequest(`/orders/${encodeURIComponent(razorpayOrderId)}`).then((value) =>
      providerOrderSchema.parse(value),
    ),
  ]);

  if (
    payment.id !== razorpayPaymentId ||
    payment.order_id !== razorpayOrderId ||
    providerOrder.id !== razorpayOrderId
  )
    throw new PaymentValidationError("Razorpay payment identity did not match the order.");
  if (
    payment.amount !== order.amount ||
    providerOrder.amount !== order.amount ||
    payment.currency !== order.currency ||
    providerOrder.currency !== order.currency
  )
    throw new PaymentValidationError("Razorpay payment totals did not match the order.");
  if (providerOrder.status !== "paid")
    throw new PaymentValidationError("Razorpay order has not been paid.");
  if (payment.status !== "captured")
    throw new PaymentValidationError("Payment has not been captured.");

  const paid = await markOrderPaid(
    order.id,
    razorpayPaymentId,
    payment.status,
    new Date().toISOString(),
  );
  return publicConfirmation(paid);
}

export async function verifyRazorpayPayment(input: z.infer<typeof razorpayPaymentSchema>) {
  const data = razorpayPaymentSchema.parse(input);
  const { keySecret } = credentials();
  if (
    !safeSignatureMatches(
      `${data.razorpayOrderId}|${data.razorpayPaymentId}`,
      data.razorpaySignature,
      keySecret,
    )
  )
    throw new PaymentValidationError();
  return settleRazorpayPayment(data.razorpayOrderId, data.razorpayPaymentId);
}

export async function processRazorpayWebhook(rawBody: string, signature: string | null) {
  if (!signature || !safeSignatureMatches(rawBody, signature, webhookSecret()))
    throw new PaymentValidationError("Webhook signature verification failed.");
  const event = webhookSchema.parse(JSON.parse(rawBody));
  return settleRazorpayPayment(
    event.payload.payment.entity.order_id,
    event.payload.payment.entity.id,
  );
}

export async function getPaidOrderConfirmation(reference: string) {
  const order = await findOrderByReference(reference);
  if (!order || order.status !== "paid") return null;
  return publicConfirmation(order);
}

export function razorpayErrorStatus(error: unknown) {
  if (error instanceof OrderConflictError) return 409;
  if (error instanceof PaymentNotFoundError) return 404;
  if (error instanceof PaymentProviderError || error instanceof OrderPersistenceError) return 503;
  return 400;
}
