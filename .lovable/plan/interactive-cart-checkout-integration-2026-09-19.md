# Interactive Cart Checkout Integration

## Goal
Replace the existing cart drawer with an animated two-stage cart and order-summary experience that follows Alchmyth’s established design language and remains entirely front-end only.

## Implementation
- Add `src/components/ui/interactive-checkout.tsx`, adapted for this TanStack React app rather than copied with incompatible Next.js assumptions.
- Reuse the existing shared store state so Add buttons, cart count, quantity controls, removal, and subtotal remain synchronized across every page.
- Replace the current cart drawer contents with the new checkout component instead of adding a separate catalogue or duplicate cart.
- Present cart items with the existing emoji product artwork, product name/category, INR formatting, quantity controls, removal, animated totals, and empty state.
- Make Checkout open a local order-summary view showing line items, quantities, subtotal, and a clear “Payment coming soon” state; it will not send, save, or charge anything.
- Preserve the current drawer trigger and mobile behavior, with a compact stacked layout on small screens and a wider, structured layout where space allows.

## Design Language
- Use only the current semantic theme: background `#ECEDDA`, primary `#02682C`, accent `#FF86BD`, existing slate/grey supporting colors, and bright blue only for focus states.
- Keep Wix Madefor Display headings, Helvetica Neue body text, 4px corner treatment, crisp one-pixel borders, grid-based composition, and restrained transitions.
- Use existing product-art blocks rather than the shoe images or external assets from the sample.
- Use Lucide icons and the project’s existing shadcn Button and Sheet components; do not overwrite the customized Button implementation.

## Technical Details
- The project already has TypeScript, Tailwind CSS v4, shadcn structure, `src/components/ui` as the component path, and `src/styles.css` as the style path.
- Install only the missing dependencies: `framer-motion` and `@number-flow/react`. `lucide-react`, `@radix-ui/react-slot`, and `class-variance-authority` already exist.
- Remove the sample’s unsupported `next/image` import and use the existing artwork component.
- Type cart state explicitly and avoid creating a second local cart source of truth.
- Respect reduced-motion preferences and provide labels for all icon-only controls.

## Validation
- Verify adding from product cards and product detail pages updates the same cart.
- Verify increment, decrement, removal, empty state, INR subtotal animation, and order-summary transition.
- Check desktop and mobile drawer layouts for clipping or overlap.
- Confirm the pricing calculator and quote flow remain unchanged.
- Confirm tests pass and the preview reports no build or runtime errors.

## Scope
No backend, payment processing, authentication, database, external product images, or owner tools will be added.
