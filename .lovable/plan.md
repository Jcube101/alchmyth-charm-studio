# Alchmyth Storefront MVP

## Goal
Build a front-end-only, mobile-first storefront inspired by Alchmyth, using hardcoded product data and emoji-based pastel artwork. The key addition is a live, reusable custom/bulk quote calculator on bag charm product pages.

## Pages and navigation
- Create a shared announcement bar, responsive header, wordmark, navigation, search control, login label, working cart drawer, and full footer/newsletter area.
- Build `/` with the supplied hero copy, 8 New Arrivals, 10 category tiles, 8 As Seen on Reels products, Instagram strip, and footer.
- Build `/category/all-products` with all supplied products in a responsive grid and a category filter; category tiles will open this page with the relevant filter selected.
- Build `/product/$slug` for every product, with emoji artwork, name, price, description, quantity control, stock state, and Add to Cart.
- Build `/contact` as a simple branded contact placeholder.
- Add unique titles, descriptions, Open Graph metadata, and social-card metadata for every content page.

## Store interactions
- Keep product, category, stock, description, and price data in a single typed static catalogue.
- Add-to-cart actions will update a client-side cart drawer with quantity controls, item removal, subtotal, empty state, and Indian currency formatting. Cart state will last for the current browser session only.
- The search control will open a lightweight product search panel using the static catalogue.
- Newsletter and login remain presentation-only; no accounts, checkout, payment, or data submission will be introduced.

## Bulk pricing engine
- Add `src/lib/pricing.ts` containing one typed configuration object keyed by bag-charm SKU and one pure calculation function.
- Support MOQ, quantity limits/step snapping, round-up increments, volume discounts, per-unit options, delivery multiplier, and one-time fees entirely from configuration.
- Return display-ready calculation data: effective quantity, active/next tier, discounted base, selected adjustments, unit price, total, savings versus undiscounted list price, and line items.
- Add unit tests covering:
  - 50 units with no options = ₹1,620 per unit and ₹81,000 total.
  - 100 units, 2 charms, branding, and express delivery = ₹1,940 per unit and ₹1,94,000 total.
  - Quantity snapping, tier transitions, one-time sample fee, and round-up behavior.

## Calculator experience
- Show the `Buy 1` / `Custom / Bulk order` segmented choice only for bag charms.
- Replace the regular purchase controls with the calculator when bulk mode is active.
- Provide synchronized quantity slider and numeric input, four-stop charm selector, branding toggle, delivery choice, and sample toggle.
- Update pricing instantly without submission or reload.
- Always display unit price, list price strike-through where applicable, active discount, total, savings, detailed line items, tier ladder, active-tier emphasis, and units needed for the next tier.

## Quote request flow
- Open a dialog from `Request this quote` with name, email or WhatsApp, occasion, notes, and needed-by date.
- Validate required fields locally, then replace the form with an in-memory confirmation card.
- Generate a local quote reference, show the selected configuration and calculated totals, include the seven-day/50%-advance note, and provide a working clipboard-copy action.
- Send and store nothing outside the current page session.

## Visual direction and polish
- Use a cream canvas, pastel colour blocks, restrained rounded cards, rounded sans-serif typography, playful decorative details, and product-specific emoji compositions.
- Define all colours, type, borders, shadows, and states as semantic theme tokens; reuse the existing interface components for buttons, dialogs, drawers, sliders, toggles, and inputs.
- Add responsive desktop/mobile layouts, accessible labels and focus states, reduced-motion support, out-of-stock behavior, empty cart/search results, and navigation loading feedback.
- Verify the storefront, cart, filtering, product modes, calculator math, quote dialog, clipboard flow, metadata, and key mobile/desktop layouts in the running preview.

## Technical boundaries
- Keep the existing TanStack Start routing foundation (the project’s React/Vite setup) while delivering the requested routes and behavior.
- No Lovable Cloud, database, authentication, payments, owner tools, cost data, or margin data.
- Add only the test tooling needed for the pure pricing unit tests.
