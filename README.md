# Alchmyth Charm Studio

Build a front-end-only MVP (React + Vite + Tailwind + shadcn/ui, no backend, all data in code) that recreates the storefront of Alchmyth (https://www.alchmyth.com), a handmade clay charms and illustrated stationery studio in India. The one new feature is a live "Custom / Bulk order" price calculator on bag charm product pages. Customer-facing only. No admin or owner views, and no cost or margin data anywhere in the code.

## 1. Storefront (simple replica, not pixel-perfect)

Look and feel: soft, whimsical, Pinterest / cottagecore. Cream background, pastel accents, rounded cards, a friendly rounded sans-serif. Use pastel colour blocks with an emoji instead of product photos (I will swap in real images later). Currency is INR with Indian number formatting (₹1,94,000). Mobile-first and responsive.

Header:
- Announcement bar: "Free shipping over ₹1999 ⋆.𐙚 ̊ Orders placed between 6 Sep-4 Oct will be dispatched on 5 Oct"
- "alchmyth" wordmark, nav (All Products, Contact), search icon, Log In, cart icon with a working cart drawer.

Home page, in this order:
- Hero: "Welcome to Alchmyth". Body: "Curate an intentional, tactile gift for yourself or someone else. Shape your space with a little quirk. Discover artisanal accessories, original illustrated goods, and minimalist keepsakes designed to bring vibrancy to your personal style <3"
- New Arrivals: 8 product cards, each ₹1,899 with an "Add to Cart" button. These are bag charms: Heartthrob Hotline ☎️🐈❤️ (mark Out of Stock), Morning Slice 🍞🌸🧈, Blueberry Bluff 🫐🎲💙, Olive the Crab 🦀🫒🍅, Donut Dribble 🍩🎱☕️, Picnic Catch 🤍🌷🎱, Sunny Side Hotline ☁️☎️🎲, Mermaid's Daydream 🐟🐚☁️
- Shop by categories (10 tiles): Art Postcards, Artistic Epoxy Keychains, Artistic Stickers, Bag Charms, Charm Earrings, Charm Necklace, Fridge Magnet, Handmade Hairclips, Handmade Worry Stones, Magnetic Bookmarks
- As Seen on Reels (8 cards): 'Your favourite 🥗 meal' postcard ₹99, Four leaf clover 🍀 epoxy keychain ₹99, 'Lucky girl syndrome' 🔖 magnetic bookmark ₹119, Cute apple 🍎 epoxy keychain ₹99, 'Collecting boyfriends' 🔖 magnetic bookmarks ₹119, Tomato 🍅 Worry Stone ₹249, Stickers / Pack of 14 ₹599, 'Do it for the plot' postcard ₹99
- "Follow us on Instagram @alchmyth" strip
- Footer: Shop All, New Arrivals, Bestsellers, About Us, Terms, Privacy, Shipping, Refund, plus a newsletter email signup ("Subscribe for behind-the-scenes messy magic...")

Routes: / (home), /category/all-products (grid of every product with a category filter), /product/:slug (detail page). Contact can be a simple placeholder.

## 2. Product detail page

Standard layout: image block, name, price, description, quantity, Add to Cart.

For BAG CHARM products only, add a two-option toggle under the price: "Buy 1" (normal purchase) and "Custom / Bulk order". Selecting "Custom / Bulk order" replaces the purchase box with the calculator below.

## 3. Custom / Bulk calculator (the core of this build)

Put ALL pricing rules in one config object plus one pure function in /src/lib/pricing.ts. The UI must contain no pricing logic. Adding another product later should mean adding one config entry, not new code.

Config for the bag charm SKU (all values are placeholders that I will edit):
- basePrice: 1800 per unit
- moq: 50
- quantity: slider from 50 to 1000 in steps of 10, plus a number input that snaps to the step
- roundUpTo: 10
- volume tiers (discount applies to the base price only, not to add-ons): 50+ = 10%, 100+ = 15%, 250+ = 20%
- Option groups:
  1. "Customised charms": slider with 4 stops: None (+₹0/unit), 1 charm (+₹100/unit), 2 charms (+₹180/unit), 3 charms (+₹250/unit)
  2. "Custom branding (e.g. a flag)": toggle, +₹50/unit
  3. "Delivery": Standard (no change) or Express (+10% on the per-unit price)
  4. "Paid sample first": toggle, one-time ₹750 fee, not per unit

Pricing function:
  discountedBase = basePrice × (1 − tierDiscount)
  unitPrice = roundUpTo10( (discountedBase + sum of per-unit add-ons) × delivery multiplier )
  total = unitPrice × quantity + one-time fees

UI behaviour:
- The panel starts at MOQ 50 with nothing selected. That should show ₹1,620 per unit (₹1,800 struck through, "10% volume discount") and ₹81,000 total.
- Everything updates instantly on any change, with no submit button and no page reload.
- Always show: price per unit, total, "You save ₹X" versus list price, and a line-item breakdown (base, discount, each selected add-on, one-time fees).
- Show the tier ladder ("50+ → 10% off · 100+ → 15% off · 250+ → 20% off") and highlight the active tier. Tell the user how many more units unlock the next tier.
- Test case that must match: 100 units + 2 customised charms + custom branding + express delivery = ₹1,940 per unit, ₹1,94,000 total.

Below the totals, add a "Request this quote" button. It opens a dialog (name, email/WhatsApp, event or occasion, notes, needed-by date). On submit, show a confirmation card with a quote reference number and a summary of the selections, per-unit price and total, with a "Copy quote summary" button. Nothing is sent anywhere. Add a small line: "Quote valid for 7 days. 50% advance to confirm."

## 4. Build order
1. Storefront pages and static data
2. pricing.ts with the config and function, plus a few unit tests (including the two cases above)
3. Calculator UI wired to pricing.ts
4. Quote request dialog and confirmation
5. Polish: mobile layout, empty and loading states

Out of scope for now: authentication, payments (Razorpay comes later), an owner dashboard, and a backend or database.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ad8ea715-df48-41f0-823a-3a38e4d3c9f7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
