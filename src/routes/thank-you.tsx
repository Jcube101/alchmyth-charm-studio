import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Heart, ShoppingBag } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const thankYouSearchSchema = z.object({
  reference: z.string().max(40).optional(),
});

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
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setConfirmed(
      Boolean(reference && sessionStorage.getItem("alchmyth:lastPaymentReference") === reference),
    );
  }, [reference]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
      <div className="mx-auto grid size-20 place-items-center bg-secondary text-primary">
        <CheckCircle2 className="size-10" />
      </div>
      <p className="mt-8 text-xs font-semibold uppercase text-primary">
        {confirmed ? "Payment confirmed" : "A little note from Alchmyth"}
      </p>
      <h1 className="mt-3 font-display text-[40px] font-normal leading-tight text-primary sm:text-5xl">
        {confirmed ? "Thank you for your purchase" : "Thank you for visiting"}
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground">
        {confirmed
          ? "Your payment was verified successfully. Thank you for visiting Alchmyth and choosing something made with care."
          : "We’re glad you stopped by. If you’re looking to shop the full collection, visit our main Alchmyth website."}
      </p>
      {confirmed && reference && (
        <p className="mx-auto mt-6 w-fit border border-border bg-secondary px-4 py-3 text-sm">
          Order reference <strong className="text-primary">{reference}</strong>
        </p>
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
