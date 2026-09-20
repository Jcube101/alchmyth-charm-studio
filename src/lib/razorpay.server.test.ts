import { afterEach, describe, expect, it } from "vitest";
import {
  processRazorpayWebhook,
  razorpayCartSchema,
  razorpayPaymentSchema,
  verifyRazorpayPayment,
} from "@/lib/razorpay.server";

const originalKeyId = process.env["RAZORPAY_KEY_ID"];
const originalKeySecret = process.env["RAZORPAY_KEY_SECRET"];
const originalWebhookSecret = process.env["RAZORPAY_WEBHOOK_SECRET"];

afterEach(() => {
  if (originalKeyId === undefined) delete process.env["RAZORPAY_KEY_ID"];
  else process.env["RAZORPAY_KEY_ID"] = originalKeyId;
  if (originalKeySecret === undefined) delete process.env["RAZORPAY_KEY_SECRET"];
  else process.env["RAZORPAY_KEY_SECRET"] = originalKeySecret;
  if (originalWebhookSecret === undefined) delete process.env["RAZORPAY_WEBHOOK_SECRET"];
  else process.env["RAZORPAY_WEBHOOK_SECRET"] = originalWebhookSecret;
});

describe("Razorpay request validation", () => {
  it("rejects an invalid browser payment signature before looking up an order", async () => {
    process.env["RAZORPAY_KEY_ID"] = "test_key";
    process.env["RAZORPAY_KEY_SECRET"] = "test_secret";

    await expect(
      verifyRazorpayPayment({
        razorpayOrderId: "order_alchmyth",
        razorpayPaymentId: "pay_alchmyth",
        razorpaySignature: "0".repeat(64),
      }),
    ).rejects.toThrow("Payment verification failed.");
  });

  it("rejects an invalid webhook signature", async () => {
    process.env["RAZORPAY_WEBHOOK_SECRET"] = "webhook_secret";
    await expect(
      processRazorpayWebhook(
        JSON.stringify({ event: "payment.captured", payload: {} }),
        "0".repeat(64),
      ),
    ).rejects.toThrow("Webhook signature verification failed.");
  });

  it("rejects malformed checkout and payment payloads", () => {
    expect(razorpayCartSchema.safeParse({ items: [] }).success).toBe(false);
    expect(
      razorpayPaymentSchema.safeParse({
        razorpayOrderId: "",
        razorpayPaymentId: "",
        razorpaySignature: "not-a-signature",
      }).success,
    ).toBe(false);
  });
});
