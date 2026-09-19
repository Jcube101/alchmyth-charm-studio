import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, type Product } from "@/lib/catalog";
import { useStore } from "@/features/store/store-context";
import { ProductArt } from "./product-art";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useStore();
  return (
    <article className="group overflow-hidden rounded-card border border-border bg-card shadow-soft transition-transform duration-300 hover:-translate-y-1">
      <Link to="/product/$slug" params={{ slug: product.slug }} aria-label={`View ${product.name}`}>
        <ProductArt product={product} />
      </Link>
      <div className="p-4">
        <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{product.category}</p>
        <Link to="/product/$slug" params={{ slug: product.slug }} className="block min-h-12 font-display text-lg leading-snug hover:text-primary">
          {product.name}
        </Link>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-semibold">{formatINR(product.price)}</span>
          <Button size="sm" disabled={product.outOfStock} onClick={() => addToCart(product)} aria-label={`Add ${product.name} to cart`}>
            <ShoppingBag /> {product.outOfStock ? "Out of stock" : "Add"}
          </Button>
        </div>
      </div>
    </article>
  );
}
