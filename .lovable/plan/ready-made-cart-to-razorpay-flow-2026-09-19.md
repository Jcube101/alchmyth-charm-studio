# Ready Made Cart-to-Razorpay Flow

## Goal
Open Razorpay Test Mode automatically after a Ready Made item is added, using the complete current cart total, then retain the verified purchase in the existing quote-style confirmation experience.

## Implementation
- Add a checkout request signal to the shared cart state so every Ready Made Add to Cart action opens the cart and starts payment after the updated cart is visible.
- Keep Razorpay order creation and amount calculation server-side from catalogue prices; keep signature verification mandatory before confirmation.
- Capture the paid cart snapshot and show a quote-style order confirmation dialog with an Alchmyth reference, item lines, quantity, total, Razorpay order ID, and payment ID.
- Keep the ordinary cart, review screen, manual Pay button, quantity controls, and Custom/Bulk quote flows unchanged.
- Retain the verified order details in the current page session only; no customer details or order history database is added.

## Validation
- Verify adding one and multiple Ready Made units launches Razorpay with the server-calculated cart total.
- Verify the existing manual cart checkout still works.
- Verify the order confirmation dialog appears only after successful signature verification.
- Check desktop and mobile layouts, pricing tests, type checks, and preview health.
