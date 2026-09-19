import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Mail, Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { allProducts, formatINR } from "@/lib/catalog";
import { useStore } from "@/features/store/store-context";
import { InteractiveCheckout } from "@/components/ui/interactive-checkout";

function Header() {
  const { cart, cartOpen, searchOpen, setCartOpen, setSearchOpen } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return <>
    <div className="bg-primary px-4 py-2 text-center text-[10px] font-medium text-primary-foreground sm:text-xs">Free shipping over ₹1999 ⋆.𐙚 ̊ Orders placed between 6 Sep-4 Oct will be dispatched on 5 Oct</div>
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid h-18 max-w-site grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 sm:px-6">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></Button>
        <Link to="/" className="font-display text-3xl font-semibold text-primary">alchmyth</Link>
        <nav className="hidden items-center justify-center gap-7 text-sm font-medium md:flex">
          <Link to="/category/all-products" search={{ category: "all" }} activeProps={{ className: "text-primary" }}>All Products</Link>
          <Link to="/contact" activeProps={{ className: "text-primary" }}>Contact</Link>
        </nav>
        <div className="flex shrink-0 items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Search products"><Search /></Button>
          <span className="hidden items-center gap-1 text-sm sm:flex"><UserRound className="size-4" /> Log In</span>
          <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(true)} aria-label={`Open cart with ${count} items`}><ShoppingBag />{count > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">{count}</span>}</Button>
        </div>
      </div>
    </header>
    <MenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
    <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    <SearchSheet open={searchOpen} onOpenChange={setSearchOpen} />
  </>;
}

function MenuSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="left" className="bg-background"><SheetHeader><SheetTitle className="font-display text-2xl">alchmyth</SheetTitle><SheetDescription>Little things, made slowly.</SheetDescription></SheetHeader><nav className="mt-10 grid gap-5 text-xl font-semibold"><Link to="/" onClick={() => onOpenChange(false)}>Home</Link><Link to="/category/all-products" search={{ category: "all" }} onClick={() => onOpenChange(false)}>All Products</Link><Link to="/contact" onClick={() => onOpenChange(false)}>Contact</Link></nav></SheetContent></Sheet>;
}
function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { cart, checkoutRequest, updateQuantity, removeFromCart } = useStore();
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="flex w-full flex-col bg-background px-5 pb-6 pt-7 sm:max-w-lg sm:px-7"><SheetHeader className="pr-10 text-left"><p className="text-[10px] font-semibold uppercase text-primary">Your selection</p><SheetTitle className="font-display text-2xl font-medium text-primary">Little collection</SheetTitle><SheetDescription>{cart.length ? "Made slowly, chosen thoughtfully." : "Your cart is waiting for something lovely."}</SheetDescription></SheetHeader><div className="mt-6 flex min-h-0 flex-1"><InteractiveCheckout cart={cart} checkoutRequest={checkoutRequest} updateQuantity={updateQuantity} removeFromCart={removeFromCart} onContinueShopping={() => onOpenChange(false)} /></div></SheetContent></Sheet>;
}
function SearchSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const results = allProducts.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()));
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="top" className="bg-background"><div className="mx-auto max-w-2xl"><SheetHeader><SheetTitle className="font-display text-2xl">Find a little something</SheetTitle><SheetDescription>Search the Alchmyth collection.</SheetDescription></SheetHeader><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try ‘charm’ or ‘postcard’" className="mt-5"/><div className="mt-4 grid max-h-72 gap-2 overflow-auto">{results.length ? results.slice(0, 8).map((product) => <Link key={product.slug} to="/product/$slug" params={{ slug: product.slug }} onClick={() => onOpenChange(false)} className="flex items-center justify-between rounded-md p-3 hover:bg-accent"><span>{product.emoji} {product.name}</span><span className="text-sm text-muted-foreground">{formatINR(product.price)}</span></Link>) : <p className="py-8 text-center text-muted-foreground">No tiny treasures found.</p>}</div></div></SheetContent></Sheet>;
}
function Footer() {
  const links = ["Shop All", "New Arrivals", "Bestsellers", "About Us", "Terms", "Privacy", "Shipping", "Refund"];
  return <footer className="mt-20 border-t border-border bg-secondary"><div className="mx-auto grid max-w-site gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.2fr]"><div><p className="font-display text-3xl font-medium text-primary">alchmyth</p><p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Slow-made clay charms and illustrated paper things from India, full of character and tiny joys.</p><div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm">{links.map((label) => <span className="hover:text-primary hover:underline" key={label}>{label}</span>)}</div></div><form onSubmit={(event) => event.preventDefault()}><Mail className="mb-3 size-5 text-primary"/><h2 className="font-display text-xl font-medium text-primary">Subscribe for behind-the-scenes messy magic...</h2><div className="mt-4 flex gap-2"><Input type="email" aria-label="Email address" placeholder="you@example.com"/><Button type="submit">Subscribe</Button></div></form></div></footer>;
}
export function StoreShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background"><Header/><main>{children}</main><Footer/></div>;
}
