import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductArt } from "@/components/store/product-art";
import { BulkCalculator } from "@/components/store/bulk-calculator";
import { getProduct, formatINR } from "@/lib/catalog";
import { useStore } from "@/features/store/store-context";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => { const product = getProduct(params.slug); if (!product) throw notFound(); return product; },
  head: ({ loaderData }) => ({ meta: [
    { title: loaderData ? `${loaderData.name} — Alchmyth` : "Product unavailable — Alchmyth" },
    { name: "description", content: loaderData?.description ?? "This Alchmyth product is unavailable." },
    { property: "og:title", content: loaderData ? `${loaderData.name} — Alchmyth` : "Product unavailable — Alchmyth" },
    { property: "og:description", content: loaderData?.description ?? "This Alchmyth product is unavailable." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ...(!loaderData ? [{ name: "robots", content: "noindex" }] : []),
  ]}), component: ProductPage,
});
function ProductPage() {
  const product = Route.useLoaderData(); const { addToCart } = useStore();
  const [quantity, setQuantity] = useState(1); const [mode, setMode] = useState<"single" | "bulk">("single");
  return <div className="mx-auto max-w-site px-4 py-10 sm:px-6 sm:py-16"><div className="grid gap-8 lg:grid-cols-2 lg:gap-14"><ProductArt product={product} className="rounded-card lg:sticky lg:top-28"/><section><p className="text-xs font-bold uppercase text-primary">{product.category}</p><h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">{product.name}</h1><p className="mt-3 text-xl font-semibold">{formatINR(product.price)}</p><p className="mt-6 max-w-xl leading-7 text-muted-foreground">{product.description}</p><div className="my-8 h-px bg-border"/>{product.pricingSku && <div className="mb-6 grid grid-cols-2 rounded-md bg-secondary p-1"><Button variant={mode === "single" ? "default" : "ghost"} onClick={() => setMode("single")}>Buy 1</Button><Button variant={mode === "bulk" ? "default" : "ghost"} onClick={() => setMode("bulk")}>Custom / Bulk order</Button></div>}{mode === "bulk" && product.pricingSku ? <BulkCalculator productName={product.name}/> : <div><p className="mb-3 text-sm font-semibold">Quantity</p><div className="flex items-center gap-3"><div className="flex items-center rounded-md border border-border"><Button variant="ghost" size="icon" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus/></Button><span className="w-10 text-center">{quantity}</span><Button variant="ghost" size="icon" onClick={() => setQuantity((value) => value + 1)} aria-label="Increase quantity"><Plus/></Button></div><Button size="lg" className="flex-1" disabled={product.outOfStock} onClick={() => addToCart(product, quantity)}><ShoppingBag/>{product.outOfStock ? "Out of stock" : "Add to cart"}</Button></div><p className="mt-4 text-sm text-muted-foreground">Each piece is handmade in small batches and may vary slightly.</p></div>}</section></div></div>;
}
