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
    <section className="relative overflow-hidden border-b border-border bg-secondary"><div aria-hidden="true" className="absolute inset-y-0 right-0 hidden w-[42%] grid-cols-2 lg:grid"><div className="bg-pastel-blue"/><div className="bg-pastel-rose"/><div className="bg-pastel-sage"/><div className="bg-background"/><span className="absolute inset-0 grid place-items-center text-7xl">☎️　🍒<br/>　🎀　🎲</span></div><div className="relative mx-auto flex min-h-[34rem] max-w-site flex-col justify-center px-4 py-20 sm:px-6 lg:min-h-[38rem]"><p className="mb-4 text-xs font-semibold uppercase text-primary">Clay, colour & tiny joys</p><h1 className="max-w-2xl font-display text-[40px] font-normal leading-[1.15] text-primary sm:text-6xl">Welcome to Alchmyth</h1><p className="mt-6 max-w-xl text-base leading-7 text-foreground/75">Curate an intentional, tactile gift for yourself or someone else. Shape your space with a little quirk. Discover artisanal accessories, original illustrated goods, and minimalist keepsakes designed to bring vibrancy to your personal style &lt;3</p><Button asChild size="lg" className="mt-8 w-fit"><Link to="/category/all-products" search={{ category: "all" }}>Shop tiny treasures <ArrowRight/></Link></Button><div aria-hidden="true" className="mt-12 grid grid-cols-4 lg:hidden"><span className="grid aspect-square place-items-center bg-pastel-blue text-3xl">☎️</span><span className="grid aspect-square place-items-center bg-pastel-rose text-3xl">🍒</span><span className="grid aspect-square place-items-center bg-pastel-sage text-3xl">🎀</span><span className="grid aspect-square place-items-center bg-background text-3xl">🎲</span></div></div></section>
    <ProductSection title="New Arrivals" eyebrow="Fresh from the studio" products={newArrivals}/>
    <section className="bg-secondary py-16"><div className="mx-auto max-w-site px-4 sm:px-6"><SectionHeading eyebrow="Find your thing" title="Shop by category"/><div className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">{categories.map((category, index) => <Link key={category} to="/category/all-products" search={{ category }} className="flex aspect-[4/3] flex-col justify-between bg-card p-4 transition-colors duration-200 hover:bg-accent"><span className="text-3xl">{categoryEmoji[index]}</span><span className="font-display text-base font-medium leading-tight text-primary">{category}</span></Link>)}</div></div></section>
    <ProductSection title="As Seen on Reels" eyebrow="Saved, shared, loved" products={reelFeatures}/>
    <section className="border-y border-border bg-primary px-4 py-10 text-center text-primary-foreground"><Instagram className="mx-auto mb-3"/><p className="font-display text-2xl font-medium sm:text-3xl">Follow us on Instagram @alchmyth</p></section>
  </>;
}
function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <div><p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p><h2 className="mt-2 font-display text-3xl font-medium text-primary">{title}</h2></div>; }
function ProductSection({ title, eyebrow, products }: { title: string; eyebrow: string; products: typeof newArrivals }) { return <section className="py-16"><div className="mx-auto max-w-site px-4 sm:px-6"><div className="flex items-end justify-between"><SectionHeading title={title} eyebrow={eyebrow}/><Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/category/all-products" search={{ category: "all" }}>View all <ArrowRight/></Link></Button></div><div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{products.map((product) => <ProductCard product={product} key={product.slug}/>)}</div></div></section>; }
