"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import {
  ArrowLeft,
  CreditCard,
  LoaderCircle,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductArt } from "@/components/store/product-art";
import { formatINR, type Product } from "@/lib/catalog";

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

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void; close: () => void };
  }
}

let razorpayScriptPromise: Promise<boolean> | null = null;

type InteractiveCheckoutProps = {
  cart: CheckoutItem[];
  active: boolean;
  updateQuantity: (slug: string, quantity: number) => void;
  removeFromCart: (slug: string) => void;
  onContinueShopping: () => void;
  onPaymentSuccess: () => void;
};

export function InteractiveCheckout({
  cart,
  active,
  updateQuantity,
  removeFromCart,
  onContinueShopping,
  onPaymentSuccess,
}: InteractiveCheckoutProps) {
  const [view, setView] = useState<"cart" | "summary">("cart");
  const [paymentState, setPaymentState] = useState<"idle" | "loading" | "error">("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const attemptRef = useRef(0);
  const activeRef = useRef(active);
  const loadingRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const checkoutRef = useRef<{ open: () => void; close: () => void } | null>(null);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  useEffect(() => {
    if (cart.length === 0) setView("cart");
  }, [cart.length]);

  useEffect(() => {
    activeRef.current = active;
    if (!active) cancelPaymentAttempt();
  }, [active]);

  useEffect(() => () => cancelPaymentAttempt(), []);

  function cancelPaymentAttempt() {
    attemptRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    checkoutRef.current?.close();
    checkoutRef.current = null;
    loadingRef.current = false;
    setPaymentState("idle");
    setPaymentMessage("");
  }

  function loadRazorpay() {
    if (window.Razorpay) return true;
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

  async function beginPayment() {
    if (loadingRef.current || checkoutRef.current || cart.length === 0) return;
    loadingRef.current = true;
    const attempt = ++attemptRef.current;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const isCurrent = () =>
      activeRef.current && attemptRef.current === attempt && !controller.signal.aborted;
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
            checkoutRef.current = null;
            requestControllerRef.current = null;
            loadingRef.current = false;
            onPaymentSuccess();
            await navigate({ to: "/thank-you", search: { reference } });
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
            if (attemptRef.current !== attempt) return;
            checkoutRef.current = null;
            requestControllerRef.current = null;
            setPaymentState("error");
            setPaymentMessage("The payment could not be verified. No order has been confirmed.");
            loadingRef.current = false;
          }
        },
        modal: {
          ondismiss: () => {
            if (attemptRef.current !== attempt) return;
            checkoutRef.current = null;
            requestControllerRef.current = null;
            loadingRef.current = false;
            setPaymentState("idle");
            setPaymentMessage("");
          },
        },
        theme: { color: "#02682C" },
      });
      if (!isCurrent()) {
        checkout.close();
        return;
      }
      checkoutRef.current = checkout;
      checkout.open();
      loadingRef.current = false;
      setPaymentState("idle");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!isCurrent()) return;
      checkoutRef.current = null;
      requestControllerRef.current = null;
      setPaymentState("error");
      setPaymentMessage(
        error instanceof Error
          ? error.message
          : "The test payment could not start. Please try again.",
      );
      loadingRef.current = false;
    }
  }

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {view === "cart" ? (
          <motion.div
            key="cart"
            initial={{ opacity: 0, x: reduceMotion ? 0 : -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduceMotion ? 0 : -16 }}
            transition={transition}
            className="flex min-h-0 flex-1 flex-col"
          >
            {cart.length === 0 ? (
              <div className="grid flex-1 place-items-center py-16 text-center">
                <div>
                  <span
                    className="mx-auto grid size-20 place-items-center border border-border bg-secondary text-4xl"
                    aria-hidden="true"
                  >
                    🧺
                  </span>
                  <p className="mt-6 font-display text-2xl font-medium text-primary">
                    Your collection is empty
                  </p>
                  <p className="mx-auto mt-2 max-w-64 text-sm leading-6 text-muted-foreground">
                    A tiny handmade treasure would look lovely here.
                  </p>
                  <Button className="mt-6" onClick={onContinueShopping}>
                    Browse all products
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto border-y border-border">
                  <AnimatePresence initial={false}>
                    {cart.map(({ product, quantity }) => (
                      <motion.article
                        layout
                        key={product.slug}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: reduceMotion ? 0 : 20 }}
                        transition={transition}
                        className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 border-b border-border py-5 last:border-b-0"
                      >
                        <ProductArt product={product} className="size-20" />
                        <div className="min-w-0">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-display text-base font-semibold leading-snug text-primary">
                                {product.name}
                              </h3>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {product.category}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 shrink-0"
                              onClick={() => removeFromCart(product.slug)}
                              aria-label={`Remove ${product.name}`}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="flex h-8 items-center border border-border bg-background">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => updateQuantity(product.slug, quantity - 1)}
                                aria-label={`Decrease ${product.name} quantity`}
                              >
                                <Minus />
                              </Button>
                              <span
                                className="w-8 text-center text-sm tabular-nums"
                                aria-live="polite"
                              >
                                {quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => updateQuantity(product.slug, quantity + 1)}
                                aria-label={`Increase ${product.name} quantity`}
                              >
                                <Plus />
                              </Button>
                            </div>
                            <span className="text-sm font-semibold tabular-nums">
                              {formatINR(product.price * quantity)}
                            </span>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="pt-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        Subtotal · {totalItems} item{totalItems === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Shipping calculated later
                      </p>
                    </div>
                    <p className="font-display text-2xl font-medium text-primary">
                      <NumberFlow
                        value={totalPrice}
                        format={{ style: "currency", currency: "INR", maximumFractionDigits: 0 }}
                        locales="en-IN"
                      />
                    </p>
                  </div>
                  <Button size="lg" className="mt-5 w-full" onClick={() => setView("summary")}>
                    <CreditCard /> Review order
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
            transition={transition}
            className="flex min-h-0 flex-1 flex-col"
          >
            <Button
              variant="ghost"
              className="mb-5 w-fit px-0 hover:bg-transparent"
              onClick={() => setView("cart")}
            >
              <ArrowLeft /> Back to cart
            </Button>
            <div className="min-h-0 flex-1 overflow-y-auto border-y border-border">
              {cart.map(({ product, quantity }) => (
                <div
                  key={product.slug}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-border py-4 last:border-b-0"
                >
                  <div>
                    <p className="font-display font-semibold text-primary">{product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {quantity} × {formatINR(product.price)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatINR(product.price * quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="pt-5">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="font-display text-lg font-medium">Order total</span>
                <span className="font-display text-2xl font-medium text-primary">
                  <NumberFlow
                    value={totalPrice}
                    format={{ style: "currency", currency: "INR", maximumFractionDigits: 0 }}
                    locales="en-IN"
                  />
                </span>
              </div>
              <div className="mt-5">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={beginPayment}
                  disabled={paymentState === "loading"}
                >
                  {paymentState === "loading" ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <CreditCard />
                  )}
                  {paymentState === "loading"
                    ? "Opening secure checkout…"
                    : `Pay ${formatINR(totalPrice)}`}
                </Button>
                <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 text-success" /> Secure Razorpay Test Mode checkout
                </p>
                {paymentState === "error" && (
                  <p className="mt-3 text-center text-sm text-destructive" role="alert">
                    {paymentMessage}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
