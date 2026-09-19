import { cn } from "@/lib/utils";
import type { Product } from "@/lib/catalog";

const paletteClasses: Record<Product["palette"], string> = {
  rose: "bg-pastel-rose", blue: "bg-pastel-blue", sage: "bg-pastel-sage", butter: "bg-pastel-butter", lilac: "bg-pastel-lilac",
};
export function ProductArt({ product, className }: { product: Product; className?: string }) {
  return (
    <div className={cn("relative flex aspect-square items-center justify-center overflow-hidden", paletteClasses[product.palette], className)}>
      {product.image ? (
        <img src={product.image} alt={product.name} className="product-image-motion size-full object-cover group-hover:scale-110 group-hover:brightness-[.85] group-hover:contrast-[1.15]" />
      ) : (
        <>
          <span aria-hidden="true" className="product-image-motion select-none text-center text-5xl leading-relaxed group-hover:scale-110 group-hover:brightness-[.85] group-hover:contrast-[1.15] sm:text-6xl">{product.emoji}</span>
          <span className="absolute left-4 top-4 text-[10px] font-medium uppercase text-foreground/60">handmade</span>
          <span aria-hidden="true" className="absolute bottom-4 right-4 font-display text-2xl text-foreground/25">✦</span>
        </>
      )}
    </div>
  );
}
