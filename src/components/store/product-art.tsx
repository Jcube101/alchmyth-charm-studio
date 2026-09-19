import { cn } from "@/lib/utils";
import type { Product } from "@/lib/catalog";

const paletteClasses: Record<Product["palette"], string> = {
  rose: "bg-pastel-rose", blue: "bg-pastel-blue", sage: "bg-pastel-sage", butter: "bg-pastel-butter", lilac: "bg-pastel-lilac",
};
export function ProductArt({ product, className }: { product: Product; className?: string }) {
  return (
    <div className={cn("relative flex aspect-square items-center justify-center overflow-hidden", paletteClasses[product.palette], className)}>
      <span aria-hidden="true" className="select-none text-center text-5xl leading-relaxed sm:text-6xl">{product.emoji}</span>
      <span className="absolute left-4 top-4 text-xs font-semibold uppercase text-foreground/55">handmade</span>
      <span aria-hidden="true" className="absolute bottom-4 right-4 font-display text-2xl text-foreground/25">✿</span>
    </div>
  );
}
