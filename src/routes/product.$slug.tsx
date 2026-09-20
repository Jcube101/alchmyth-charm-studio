import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductArt } from "@/components/store/product-art";
import { DifferenceTooltip, OrderCalculator } from "@/components/store/bulk-calculator";
import { getProduct, formatINR } from "@/lib/catalog";
import { pricingConfig, type OrderMode } from "@/lib/pricing";
import { useStore } from "@/features/store/store-context";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => { const product = getProduct(params.slug); if (!product) throw notFound(); return product; },
  head: ({ loaderData }) => ({ meta: [
    { title: "Alchmyth" },
    { name: "description", content: loaderData?.description ?? "This Alchmyth product is unavailable." },
    { property: "og:title", content: loaderData ? `${loaderData.name} — Alchmyth` : "Product unavailable — Alchmyth" },
    { property: "og:description", content: loaderData?.description ?? "This Alchmyth product is unavailable." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ...(!loaderData ? [{ name: "robots", content: "noindex" }] : []),
  ]}), component: ProductPage,
});
function ProductPage() {
  const product = Route.useLoaderData(); const { addToCart } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState<OrderMode>("ready");
  const modeConfig = product.pricingSku ? pricingConfig[product.pricingSku].modes[mode] : undefined;
  return <div className="mx-auto max-w-site px-4 py-10 sm:px-6 sm:py-16"><div className="grid gap-8 lg:grid-cols-2 lg:gap-16"><div className="group lg:sticky lg:top-28 lg:self-start"><ProductArt product={product}/></div><section><p className="text-xs font-semibold uppercase text-primary">{product.category}</p><h1 className="mt-2 font-display text-[40px] font-normal leading-tight text-primary">{product.name}</h1><p className="mt-4 text-xl font-medium">{formatINR(product.price)}</p><p className="mt-6 max-w-xl text-[15px] font-light leading-7 text-muted-foreground">{product.description}</p><div className="my-8 h-px bg-border"/>{product.pricingSku ? <div><div className="grid grid-cols-3 bg-secondary p-1">{(["ready", "custom", "bulk"] as const).map((item) => <Button key={item} size="sm" variant={mode === item ? "default" : "ghost"} className="h-auto min-h-10 whitespace-normal px-2" onClick={() => setMode(item)}>{pricingConfig[product.pricingSku ?? "bag-charm"].modes[item].label}</Button>)}</div><div className="mb-5 flex items-start justify-between gap-4 border-x border-b border-border px-3 py-3"><p className="text-sm leading-6 text-muted-foreground">{modeConfig?.helper}</p><DifferenceTooltip /></div><OrderCalculator key={mode} product={product} mode={mode} /></div> : <div><p className="mb-3 text-sm font-semibold">Quantity</p><div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"><div className="flex items-center border border-border"><Button variant="ghost" size="icon" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus/></Button><span className="w-10 text-center">{quantity}</span><Button variant="ghost" size="icon" onClick={() => setQuantity((value) => value + 1)} aria-label="Increase quantity"><Plus/></Button></div><Button size="lg" className="min-w-0" disabled={product.outOfStock} onClick={() => addToCart(product, quantity)}><ShoppingBag/>{product.outOfStock ? "Out of stock" : "Add to cart"}</Button></div><p className="mt-4 text-sm text-muted-foreground">Each piece is handmade in small batches and may vary slightly.</p></div>}</section></div></div>;
}
