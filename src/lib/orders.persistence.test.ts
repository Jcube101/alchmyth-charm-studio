import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";
import { orders } from "../../drizzle/schema";
import { getDatabase } from "./database.server";
import {
  createRazorpayOrder,
  getPaidOrderConfirmation,
  processRazorpayWebhook,
  verifyRazorpayPayment,
} from "./razorpay.server";

const trackedReferences: string[] = [];
let providerOrderId = "";
let paymentAmount = 189_900;
let paymentCurrency = "INR";
let paymentStatus = "captured";
let paymentOrderId = "";
let providerOrderAmount = 189_900;
let providerOrderCurrency = "INR";
let providerOrderStatus = "paid";
let fetchedProviderOrderId = "";
let orderSequence = 0;

function signature(orderId: string, paymentId: string) {
  return createHmac("sha256", "test_secret").update(`${orderId}|${paymentId}`).digest("hex");
}

function webhookBody(orderId: string, paymentId: string) {
  return JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          amount: 189_900,
          currency: "INR",
          status: "captured",
        },
      },
    },
  });
}

beforeEach(() => {
  process.env["RAZORPAY_KEY_ID"] = "rzp_test_key";
  process.env["RAZORPAY_KEY_SECRET"] = "test_secret";
  process.env["RAZORPAY_WEBHOOK_SECRET"] = "webhook_secret";
  paymentAmount = 189_900;
  paymentCurrency = "INR";
  paymentStatus = "captured";
  providerOrderAmount = 189_900;
  providerOrderCurrency = "INR";
  providerOrderStatus = "paid";
  providerOrderId = `order_persistence_${++orderSequence}`;
  paymentOrderId = providerOrderId;
  fetchedProviderOrderId = providerOrderId;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/orders") && init?.method === "POST")
        return Response.json({
          id: providerOrderId,
          amount: 189_900,
          currency: "INR",
          status: "created",
        });
      if (url.includes("/payments/")) {
        const paymentId = decodeURIComponent(url.split("/").at(-1) ?? "");
        return Response.json({
          id: paymentId,
          order_id: paymentOrderId,
          amount: paymentAmount,
          currency: paymentCurrency,
          status: paymentStatus,
        });
      }
      if (url.includes("/orders/"))
        return Response.json({
          id: fetchedProviderOrderId,
          amount: providerOrderAmount,
          currency: providerOrderCurrency,
          status: providerOrderStatus,
        });
      return new Response("Not found", { status: 404 });
    }),
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  if (trackedReferences.length) {
    await getDatabase()
      .delete(orders)
      .where(inArray(orders.reference, trackedReferences.splice(0)));
  }
});

async function createPending() {
  const checkout = await createRazorpayOrder({
    items: [{ slug: "morning-slice", quantity: 1 }],
  });
  trackedReferences.push(checkout.reference);
  return checkout;
}

describe("paid order persistence", () => {
  it("stores a server-priced snapshot and marks the same payment paid idempotently", async () => {
    const checkout = await createPending();
    const [pending] = await getDatabase()
      .select()
      .from(orders)
      .where(inArray(orders.reference, [checkout.reference]));

    expect(pending).toMatchObject({
      reference: checkout.reference,
      status: "pending",
      amount: 189_900,
      currency: "INR",
      razorpayOrderId: providerOrderId,
      razorpayPaymentId: null,
      fulfillmentStatus: "not_ready",
    });
    expect(pending?.items).toEqual([
      {
        slug: "morning-slice",
        name: "Morning Slice",
        quantity: 1,
        unitAmount: 189_900,
        lineAmount: 189_900,
      },
    ]);

    const input = {
      razorpayOrderId: providerOrderId,
      razorpayPaymentId: "pay_idempotent",
      razorpaySignature: signature(providerOrderId, "pay_idempotent"),
    };
    const first = await verifyRazorpayPayment(input);
    const duplicate = await verifyRazorpayPayment(input);

    expect(duplicate).toEqual(first);
    expect(first).toMatchObject({ reference: checkout.reference, status: "paid" });
    const [paid] = await getDatabase()
      .select()
      .from(orders)
      .where(inArray(orders.reference, [checkout.reference]));
    expect(paid).toMatchObject({
      status: "paid",
      razorpayPaymentId: "pay_idempotent",
      providerPaymentStatus: "captured",
      fulfillmentStatus: "unfulfilled",
    });
  });

  it.each([
    ["wrong payment order", () => (paymentOrderId = "order_other"), "identity"],
    ["wrong provider order", () => (fetchedProviderOrderId = "order_other"), "identity"],
    ["wrong payment amount", () => (paymentAmount = 100), "totals"],
    ["wrong provider order amount", () => (providerOrderAmount = 100), "totals"],
    ["wrong currency", () => (paymentCurrency = "USD"), "totals"],
    ["wrong provider order currency", () => (providerOrderCurrency = "USD"), "totals"],
    ["unpaid provider order", () => (providerOrderStatus = "attempted"), "has not been paid"],
    ["uncaptured status", () => (paymentStatus = "authorized"), "not been captured"],
  ])("keeps an order pending for %s", async (_name, mutate, message) => {
    const checkout = await createPending();
    mutate();
    await expect(
      verifyRazorpayPayment({
        razorpayOrderId: providerOrderId,
        razorpayPaymentId: `pay_invalid_${orderSequence}`,
        razorpaySignature: signature(providerOrderId, `pay_invalid_${orderSequence}`),
      }),
    ).rejects.toThrow(message);
    expect(await getPaidOrderConfirmation(checkout.reference)).toBeNull();
  });

  it("rejects a different payment after an order is already paid", async () => {
    await createPending();
    await verifyRazorpayPayment({
      razorpayOrderId: providerOrderId,
      razorpayPaymentId: "pay_first",
      razorpaySignature: signature(providerOrderId, "pay_first"),
    });
    await expect(
      verifyRazorpayPayment({
        razorpayOrderId: providerOrderId,
        razorpayPaymentId: "pay_second",
        razorpaySignature: signature(providerOrderId, "pay_second"),
      }),
    ).rejects.toThrow("already associated");
  });

  it("converges duplicate webhook and browser callbacks on one paid order", async () => {
    const checkout = await createPending();
    const body = webhookBody(providerOrderId, "pay_webhook");
    const webhookSignature = createHmac("sha256", "webhook_secret").update(body).digest("hex");

    const [first, browserRetry] = await Promise.all([
      processRazorpayWebhook(body, webhookSignature),
      verifyRazorpayPayment({
        razorpayOrderId: providerOrderId,
        razorpayPaymentId: "pay_webhook",
        razorpaySignature: signature(providerOrderId, "pay_webhook"),
      }),
    ]);
    const duplicate = await processRazorpayWebhook(body, webhookSignature);

    expect(first).toEqual(duplicate);
    expect(browserRetry).toEqual(first);
    expect(await getPaidOrderConfirmation(checkout.reference)).toEqual(first);
  });
});
