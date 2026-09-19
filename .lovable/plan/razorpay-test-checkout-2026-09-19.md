# Razorpay Test Checkout

## Goal
Add a secure Razorpay Test Mode payment flow to the existing Ready Made cart and order-summary experience, without changing Custom or Bulk quote flows.

## Checkout experience
- Keep the existing cart drawer, quantities, removal, INR subtotal, and order review.
- Replace the “Payment coming soon” action in the Ready Made order summary with a “Pay securely” button.
- Open Razorpay Checkout with the exact server-created order amount and cart summary.
- Show clear processing, success, cancellation, and payment-error states inside the checkout drawer.
- Keep Custom and Bulk orders on their existing quote-request flow.

## Secure payment flow
- Add a server function that validates cart items against the app’s static catalogue and calculates the amount server-side before creating a Razorpay test order.
- Return only the public Razorpay Key ID, order ID, currency, and verified amount to the browser.
- Add a second server function that verifies Razorpay’s payment signature with the private Key Secret before showing payment success.
- Never expose the Key Secret, trust a browser-supplied price, or mark a payment successful without signature verification.
- Do not store orders or customer details in the database for this test integration.

## Configuration
- Request `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` through Lovable’s secure secret form after the code is ready.
- Use Test Mode credentials from Razorpay Dashboard → Account & Settings → API Keys.

## Validation
- Verify the cart and review screens still work on desktop and mobile.
- Verify missing credentials and Razorpay errors produce helpful messages.
- Verify server-side amount calculation, checkout launch, and payment signature handling without exposing credentials.
- Confirm the app builds cleanly and existing pricing tests remain unaffected.
