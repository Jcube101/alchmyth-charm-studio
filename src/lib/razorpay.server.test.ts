import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  razorpayCartSchema,
  razorpayPaymentSchema,
  verifyRazorpayPayment,
} from "@/lib/razorpay.server";

const originalSecret = process.env["RAZORPAY_KEY_SECRET"];

afterEach(() => {
  if (originalSecret === undefined) delete process.env["RAZORPAY_KEY_SECRET"];
  else process.env["RAZORPAY_KEY_SECRET"] = originalSecret;
});

describe("Razorpay payment verification", () => {
  it("accepts a correctly signed payment response", () => {
    process.env["RAZORPAY_KEY_SECRET"] = "test_secret";
    const razorpayOrderId = "order_alchmyth";
    const razorpayPaymentId = "pay_alchmyth";
    const razorpaySignature = createHmac("sha256", "test_secret")
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    expect(
      verifyRazorpayPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }),
    ).toEqual({ verified: true, paymentId: razorpayPaymentId });
  });

  it("rejects an invalid payment signature", () => {
    process.env["RAZORPAY_KEY_SECRET"] = "test_secret";

    expect(() =>
      verifyRazorpayPayment({
        razorpayOrderId: "order_alchmyth",
        razorpayPaymentId: "pay_alchmyth",
        razorpaySignature: "0".repeat(64),
      }),
    ).toThrow("Payment verification failed.");
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
