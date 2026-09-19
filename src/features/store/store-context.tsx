import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/lib/catalog";

type CartItem = { product: Product; quantity: number };
type StoreContextValue = {
  cart: CartItem[];
  cartOpen: boolean;
  searchOpen: boolean;
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  removeFromCart: (slug: string) => void;
};

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const value = useMemo<StoreContextValue>(() => ({
    cart, cartOpen, searchOpen, setCartOpen, setSearchOpen,
    addToCart(product, quantity = 1) {
      if (product.outOfStock) return;
      setCart((items) => {
        const existing = items.find((item) => item.product.slug === product.slug);
        return existing
          ? items.map((item) => item.product.slug === product.slug ? { ...item, quantity: item.quantity + quantity } : item)
          : [...items, { product, quantity }];
      });
      setCartOpen(true);
    },
    updateQuantity(slug, quantity) {
      if (quantity < 1) return setCart((items) => items.filter((item) => item.product.slug !== slug));
      setCart((items) => items.map((item) => item.product.slug === slug ? { ...item, quantity } : item));
    },
    removeFromCart(slug) { setCart((items) => items.filter((item) => item.product.slug !== slug)); },
  }), [cart, cartOpen, searchOpen]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}
