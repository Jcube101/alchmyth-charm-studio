import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Heart, LoaderCircle, ShoppingBag } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/catalog";

const thankYouSearchSchema = z.object({
  reference: z
    .string()
    .regex(/^ALC-[A-F0-9]{32}$/)
    .optional(),
});

type Confirmation = {
  reference: string;
  status: "paid";
  itemCount: number;
  amount: number;
  currency: string;
};

export const Route = createFileRoute("/thank-you")({
  validateSearch: thankYouSearchSchema,
  head: () => ({
    meta: [
      { title: "Alchmyth" },
      {
        name: "description",
        content: "Thank you for supporting Alchmyth and purchasing from our store.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  const { reference } = Route.useSearch();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [loading, setLoading] = useState(Boolean(reference));

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      setConfirmation(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/orders/${encodeURIComponent(reference)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as { order?: Confirmation };
        return body.order ?? null;
      })
      .then((order) => {
        setConfirmation(order);
        setLoading(false);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setConfirmation(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [reference]);

  const confirmed = confirmation?.status === "paid";

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
      <div className="mx-auto grid size-20 place-items-center bg-secondary text-primary">
        {loading ? (
          <LoaderCircle className="size-10 animate-spin" />
        ) : (
          <CheckCircle2 className="size-10" />
        )}
      </div>
      <p className="mt-8 text-xs font-semibold uppercase text-primary">
        {loading
          ? "Checking your order"
          : confirmed
            ? "Payment confirmed"
            : "A little note from Alchmyth"}
      </p>
      <h1 className="mt-3 font-display text-[40px] font-normal leading-tight text-primary sm:text-5xl">
        {loading
          ? "Confirming your purchase"
          : confirmed
            ? "Thank you for your purchase"
            : "Thank you for visiting"}
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground">
        {loading
          ? "We’re loading the verified order details from our records."
          : confirmed
            ? "Your payment was verified successfully. Thank you for choosing something made with care."
            : "We couldn’t find a paid order for this reference. If you completed a payment, please contact Alchmyth with your payment details."}
      </p>
      {confirmed && confirmation && (
        <div className="mx-auto mt-6 max-w-md border border-border bg-secondary px-4 py-4 text-left text-sm">
          <p>
            Order reference <strong className="text-primary">{confirmation.reference}</strong>
          </p>
          <p className="mt-2 text-muted-foreground">
            {confirmation.itemCount} item{confirmation.itemCount === 1 ? "" : "s"} ·{" "}
            {formatINR(confirmation.amount / 100)}
          </p>
        </div>
      )}
      <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild>
          <Link to="/">
            <Heart /> Return home
          </Link>
        </Button>
        <Button asChild variant="outline">
          <a href="https://www.alchmyth.com/" target="_blank" rel="noopener noreferrer">
            <ShoppingBag /> Visit our main shop
          </a>
        </Button>
      </div>
    </section>
  );
}
