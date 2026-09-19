import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { categories, newArrivals, reelFeatures } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Alchmyth — Handmade Clay Charms & Illustrated Goods" },
    { name: "description", content: "Discover handmade clay bag charms, illustrated stationery and playful keepsakes from Alchmyth." },
    { property: "og:title", content: "Alchmyth — Handmade Clay Charms & Illustrated Goods" },
    { property: "og:description", content: "Small-batch clay charms and illustrated goods, made with a little quirk." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}), component: HomePage,
});
const categoryEmoji = ["💌", "✨", "🌈", "🎀", "🌼", "☁️", "🧲", "🎗️", "🍅", "🔖"];
function HomePage() {
  return <>
    <section className="relative overflow-hidden border-b border-border bg-pastel-butter"><div className="mx-auto flex min-h-[72vh] max-w-site flex-col justify-center px-4 py-20 sm:px-6 md:min-h-[68vh]"><p className="mb-4 text-sm font-bold uppercase text-primary">Clay, colour & tiny joys</p><h1 className="max-w-4xl font-display text-5xl leading-tight sm:text-7xl">Welcome to Alchmyth</h1><p className="mt-6 max-w-2xl text-base leading-7 text-foreground/75 sm:text-lg">Curate an intentional, tactile gift for yourself or someone else. Shape your space with a little quirk. Discover artisanal accessories, original illustrated goods, and minimalist keepsakes designed to bring vibrancy to your personal style &lt;3</p><Button asChild size="lg" className="mt-8 w-fit"><Link to="/category/all-products" search={{ category: "all" }}>Shop tiny treasures <ArrowRight/></Link></Button><div aria-hidden="true" className="absolute -bottom-8 right-[8%] rotate-6 text-[8rem] sm:text-[13rem]">🎀</div></div></section>
    <ProductSection title="New Arrivals" eyebrow="Fresh from the studio" products={newArrivals}/>
    <section className="bg-secondary py-16"><div className="mx-auto max-w-site px-4 sm:px-6"><SectionHeading eyebrow="Find your thing" title="Shop by category"/><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{categories.map((category, index) => <Link key={category} to="/category/all-products" search={{ category }} className="flex aspect-[4/3] flex-col justify-between rounded-card border border-border bg-card p-4 transition-transform hover:-translate-y-1"><span className="text-3xl">{categoryEmoji[index]}</span><span className="font-display text-base leading-tight">{category}</span></Link>)}</div></div></section>
    <ProductSection title="As Seen on Reels" eyebrow="Saved, shared, loved" products={reelFeatures}/>
    <section className="border-y border-border bg-primary px-4 py-10 text-center text-primary-foreground"><Instagram className="mx-auto mb-3"/><p className="font-display text-2xl sm:text-3xl">Follow us on Instagram @alchmyth</p></section>
  </>;
}
function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <div><p className="text-xs font-bold uppercase text-primary">{eyebrow}</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">{title}</h2></div>; }
function ProductSection({ title, eyebrow, products }: { title: string; eyebrow: string; products: typeof newArrivals }) { return <section className="py-16"><div className="mx-auto max-w-site px-4 sm:px-6"><div className="flex items-end justify-between"><SectionHeading title={title} eyebrow={eyebrow}/><Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/category/all-products" search={{ category: "all" }}>View all <ArrowRight/></Link></Button></div><div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{products.map((product) => <ProductCard product={product} key={product.slug}/>)}</div></div></section>; }
