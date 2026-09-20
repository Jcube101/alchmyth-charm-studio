import { describe, expect, it } from "vitest";
import { PaymentProviderError } from "./razorpay.server";
import { verifyPaymentRequest } from "../routes/api/razorpay/verify";
import { orderConfirmationResponse } from "../routes/api/orders/$reference";

const validReference = "ALC-0123456789ABCDEF0123456789ABCDEF";
const validRequest = () =>
  new Request("https://example.com/api/razorpay/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      razorpayOrderId: "order_route",
      razorpayPaymentId: "pay_route",
      razorpaySignature: "a".repeat(64),
    }),
  });

describe("Razorpay API responses", () => {
  it("awaits settlement and returns the durable reference", async () => {
    const response = await verifyPaymentRequest(validRequest(), async () => {
      await Promise.resolve();
      return {
        reference: validReference,
        status: "paid",
        itemCount: 1,
        amount: 189_900,
        currency: "INR",
      };
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ reference: validReference, status: "paid" });
  });

  it("maps an asynchronous provider failure to a retryable status", async () => {
    const response = await verifyPaymentRequest(validRequest(), async () => {
      await Promise.resolve();
      throw new PaymentProviderError("Provider unavailable.");
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Provider unavailable." });
  });

  it("returns only the minimized paid confirmation", async () => {
    const response = await orderConfirmationResponse(validReference, async () => ({
      reference: validReference,
      status: "paid",
      itemCount: 2,
      amount: 199_800,
      currency: "INR",
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      order: {
        reference: validReference,
        status: "paid",
        itemCount: 2,
        amount: 199_800,
        currency: "INR",
      },
    });
  });

  it("does not query storage for malformed references", async () => {
    let called = false;
    const response = await orderConfirmationResponse("ALC-guessable", async () => {
      called = true;
      return null;
    });

    expect(response.status).toBe(404);
    expect(called).toBe(false);
  });
});
