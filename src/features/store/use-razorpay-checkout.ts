"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Product } from "@/lib/catalog";

type CheckoutItem = { product: Product; quantity: number };

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void | Promise<void>;
  modal: { ondismiss: () => void };
  theme: { color: string };
};

type RazorpayCheckout = { open: () => void; close: () => void };

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

let razorpayScriptPromise: Promise<boolean> | null = null;

export type CheckoutFeedback = {
  message: string;
  kind: "info" | "error";
};

type UseRazorpayCheckoutOptions = {
  cart: CheckoutItem[];
  sheetOpen: boolean;
  sheetContentRef: RefObject<HTMLElement | null>;
  closeSheet: () => void;
  onPaymentSuccess: () => void;
  onFeedback: (feedback: CheckoutFeedback) => void;
};

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export async function waitForSheetRelease(sheet: HTMLElement | null, timeoutMs = 750) {
  const startedAt = performance.now();

  do {
    await nextFrame();
    const sheetIsOpen = sheet?.getAttribute("data-state") === "open";
    const bodyBlocksPointers = getComputedStyle(document.body).pointerEvents === "none";
    if (!sheetIsOpen && !bodyBlocksPointers) {
      await nextFrame();
      return;
    }
  } while (performance.now() - startedAt < timeoutMs);

  throw new Error("The cart could not close cleanly. Please try again.");
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      razorpayScriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

export function useRazorpayCheckout({
  cart,
  sheetOpen,
  sheetContentRef,
  closeSheet,
  onPaymentSuccess,
  onFeedback,
}: UseRazorpayCheckoutOptions) {
  const [paymentState, setPaymentState] = useState<"idle" | "loading" | "error">("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const attemptRef = useRef(0);
  const loadingRef = useRef(false);
  const handoffRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const checkoutRef = useRef<RazorpayCheckout | null>(null);
  const navigate = useNavigate();

  const resetAttempt = useCallback(() => {
    requestControllerRef.current = null;
    checkoutRef.current = null;
    loadingRef.current = false;
    handoffRef.current = false;
  }, []);

  const cancelPaymentAttempt = useCallback(() => {
    attemptRef.current += 1;
    requestControllerRef.current?.abort();
    checkoutRef.current?.close();
    resetAttempt();
    setPaymentState("idle");
    setPaymentMessage("");
  }, [resetAttempt]);

  useEffect(() => {
    if (!sheetOpen && !handoffRef.current) cancelPaymentAttempt();
  }, [cancelPaymentAttempt, sheetOpen]);

  useEffect(() => () => cancelPaymentAttempt(), [cancelPaymentAttempt]);

  async function beginPayment() {
    if (loadingRef.current || checkoutRef.current || cart.length === 0) return;
    loadingRef.current = true;
    const attempt = ++attemptRef.current;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const isCurrent = () => attemptRef.current === attempt && !controller.signal.aborted;
    setPaymentState("loading");
    setPaymentMessage("");

    try {
      const loaded = await loadRazorpay();
      if (!isCurrent()) return;
      if (!loaded || !window.Razorpay)
        throw new Error(
          "The secure checkout could not load. Please check your connection and try again.",
        );

      const orderItems = cart.map(({ product, quantity }) => ({ product, quantity }));
      const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          items: orderItems.map(({ product, quantity }) => ({ slug: product.slug, quantity })),
        }),
      });
      const order = (await orderResponse.json()) as {
        keyId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        error?: string;
      };
      if (!isCurrent()) return;
      if (!orderResponse.ok || !order.keyId || !order.orderId || !order.amount || !order.currency)
        throw new Error(order.error ?? "The test payment could not start. Please try again.");

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Alchmyth",
        description: `${totalItems} Ready Made item${totalItems === 1 ? "" : "s"}`,
        order_id: order.orderId,
        handler: async (response) => {
          if (!isCurrent()) return;
          loadingRef.current = true;
          setPaymentState("loading");
          try {
            const verifyResponse = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "content-type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            if (!verifyResponse.ok) throw new Error("Payment verification failed.");
            if (!isCurrent()) return;
            const reference = `ALC-${Date.now().toString().slice(-6)}`;
            sessionStorage.setItem("alchmyth:lastPaymentReference", reference);
            resetAttempt();
            onPaymentSuccess();
            await navigate({ to: "/thank-you", search: { reference } });
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
            if (attemptRef.current !== attempt) return;
            const message = "The payment could not be verified. No order has been confirmed.";
            resetAttempt();
            setPaymentState("error");
            setPaymentMessage(message);
            onFeedback({ message, kind: "error" });
          }
        },
        modal: {
          ondismiss: () => {
            if (attemptRef.current !== attempt) return;
            const message = "Payment window closed. You can try again when you’re ready.";
            resetAttempt();
            setPaymentState("idle");
            setPaymentMessage("");
            onFeedback({ message, kind: "info" });
          },
        },
        theme: { color: "#02682C" },
      });
      if (!isCurrent()) {
        checkout.close();
        return;
      }

      checkoutRef.current = checkout;
      handoffRef.current = true;
      closeSheet();
      await waitForSheetRelease(sheetContentRef.current);
      if (!isCurrent()) {
        checkout.close();
        return;
      }
      checkout.open();
      loadingRef.current = false;
      setPaymentState("idle");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!isCurrent()) return;
      const message =
        error instanceof Error
          ? error.message
          : "The test payment could not start. Please try again.";
      const feedbackOutsideSheet = handoffRef.current;
      resetAttempt();
      setPaymentState("error");
      setPaymentMessage(message);
      if (feedbackOutsideSheet) onFeedback({ message, kind: "error" });
    }
  }

  return { beginPayment, paymentMessage, paymentState };
}
