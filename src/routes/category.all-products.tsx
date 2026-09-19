import { createFileRoute } from "@tanstack/react-router";
import { ProductCard } from "@/components/store/product-card";
import { categories, allProducts } from "@/lib/catalog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/category/all-products")({
  validateSearch: (search: Record<string, unknown>) => ({ category: typeof search["category"] === "string" ? search["category"] : "all" }),
  head: () => ({ meta: [
    { title: "All Products — Alchmyth" }, { name: "description", content: "Shop all handmade clay charms, stationery and illustrated accessories from Alchmyth." },
    { property: "og:title", content: "All Products — Alchmyth" }, { property: "og:description", content: "Browse Alchmyth's playful handmade collection." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}), component: AllProductsPage,
});
function AllProductsPage() {
  const { category } = Route.useSearch(); const navigate = Route.useNavigate();
  const filtered = category === "all" ? allProducts : allProducts.filter((product) => product.category === category);
  return <div className="mx-auto max-w-site px-4 py-12 sm:px-6"><p className="text-xs font-bold uppercase text-primary">The whole shelf</p><h1 className="mt-2 font-display text-4xl sm:text-5xl">All Products</h1><div className="mt-8 flex gap-2 overflow-x-auto pb-3"><Button size="sm" variant={category === "all" ? "default" : "outline"} onClick={() => navigate({ to: ".", search: { category: "all" } })}>All</Button>{categories.map((item) => <Button key={item} size="sm" variant={category === item ? "default" : "outline"} onClick={() => navigate({ to: ".", search: { category: item } })}>{item}</Button>)}</div>{filtered.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{filtered.map((product) => <ProductCard key={product.slug} product={product}/>)}</div> : <div className="py-24 text-center"><span className="text-5xl">🧺</span><p className="mt-4 text-muted-foreground">Nothing in this basket yet.</p></div>}</div>;
}
