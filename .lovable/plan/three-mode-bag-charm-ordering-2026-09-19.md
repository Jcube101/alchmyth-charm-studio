# Three-Mode Bag Charm Ordering

## Goal
Upgrade bag-charm product pages to a three-segment purchase experience—Ready Made, Custom Order, and Bulk Order—while leaving every non-bag-charm product with the standard purchase box.

## Product Page
- Replace the current two-option control with `[ Ready Made | Custom Order | Bulk Order ]` at the top of the purchase box.
- Default to Ready Made and show the supplied one-line helper for the active segment.
- Add a compact “What’s the difference?” tooltip containing all three mode explanations.
- Reset a mode to its configured defaults whenever the customer switches into it.
- Keep the existing product image, name, price, description, cart drawer, and page styling.

## Pricing Engine
- Restructure `src/lib/pricing.ts` around one typed bag-charm configuration containing all three modes and their quantity, price, tier, option, rounding, and fee rules.
- Use one pure calculation function for Ready Made, Custom, and Bulk; the UI will only render configuration and calculated results.
- Ready Made: ₹1,899, quantity 1–1000 step 1, no rounding, discounts, or options.
- Custom: ₹1,899 base, quantity 1–30 step 1, no discount, configured add-ons, round per-unit price to ₹10, and one-time sample/design fees.
- Bulk: ₹1,800 base, quantity 30–1000 step 10, 30+/10%, 100+/15%, 250+/20%, configured add-ons, and one-time fees.
- Return normalized quantity, active and next tiers, unit price, total, savings, one-time fees, and complete line items from the pure function.
- Keep quantity snapping/clamping mode-aware.

## Purchase Controls
- Build a shared slider plus typeable number input for every mode, synchronized to each mode’s min/max/step rules.
- Ready Made shows unit price, total, and Add to Cart; adding uses the existing shared cart drawer.
- Custom and Bulk share configuration-driven controls for customised charms, branding, delivery, sample, and own-design selection.
- Custom reveals a design area immediately when own design is selected: drag/drop or click, image/PDF only, maximum three files, file previews/names, remove controls, and “Describe your idea.”
- Bulk keeps the design area out of the purchase page and displays the supplied next-step helper.
- Show instant totals and complete breakdowns for Custom and Bulk; show savings and the highlighted tier ladder only for Bulk.

## Quote Flow
- Keep the existing front-end-only quote dialog with name, email or WhatsApp, occasion, notes, and needed-by date.
- Validate trimmed input and length limits in the browser with clear field errors.
- For Custom own-design quotes, require at least one valid file or a non-empty description before opening/submitting the quote.
- For Bulk own-design quotes, add a required upload inside the quote dialog with the same image/PDF, three-file limit, preview/name, and removal behavior.
- Confirmation includes reference, mode, quantity, every selection, file names, per-unit price, total, copy action, and the seven-day/50%-advance note.
- Files and form values remain in memory only; nothing is uploaded, sent, or saved.

## Tests and Validation
- Replace the current pricing tests with the four required cases:
  - Ready Made: 3 = ₹5,697.
  - Custom: 5 + two charms + branding + express + own design = ₹2,350/unit and ₹11,850 total.
  - Bulk: 30 defaults = ₹1,620/unit and ₹48,600 total.
  - Bulk: 100 + two charms + branding + express = ₹1,940/unit and ₹1,94,000 total.
- Also cover mode-specific clamping/snapping and one-time fee behavior.
- Verify all three modes, mode resets, cart integration, upload validation/removal, quote confirmation/copy, and mobile/desktop layout in the running preview.
- Confirm the existing cart, search, other products, and product-page metadata remain healthy.

## Scope
No backend, persistent file storage, authentication, payments, owner dashboard, cost data, or margin data will be added.
