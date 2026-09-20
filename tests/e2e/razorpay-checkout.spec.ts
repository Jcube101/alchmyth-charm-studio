import { expect, test, type Page } from "@playwright/test";

type RazorpayEvent = {
  type: "construct" | "open" | "close";
  bodyPointerEvents?: string;
  openCartSheets?: number;
};

declare global {
  interface Window {
    __razorpayEvents: RazorpayEvent[];
  }
}

async function mockRazorpay(page: Page) {
  await page.addInitScript(() => {
    window.__razorpayEvents = [];

    class MockRazorpay {
      private options: {
        handler: (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => void | Promise<void>;
        modal: { ondismiss: () => void };
      };

      constructor(options: MockRazorpay["options"]) {
        this.options = options;
        window.__razorpayEvents.push({ type: "construct" });
      }

      open() {
        window.__razorpayEvents.push({
          type: "open",
          bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
          openCartSheets: document.querySelectorAll("[data-cart-sheet][data-state=open]").length,
        });
        const overlay = document.createElement("div");
        overlay.setAttribute("data-testid", "mock-razorpay");
        overlay.style.cssText =
          "position:fixed;inset:0;z-index:100;background:white;display:grid;place-items:center";
        overlay.innerHTML =
          '<button data-testid="mock-dismiss">Close payment</button><button data-testid="mock-confirm">Confirm payment</button>';
        document.body.appendChild(overlay);
        overlay.querySelector("[data-testid=mock-dismiss]")?.addEventListener("click", () => {
          overlay.remove();
          this.options.modal.ondismiss();
        });
        overlay.querySelector("[data-testid=mock-confirm]")?.addEventListener("click", () => {
          overlay.remove();
          void this.options.handler({
            razorpay_order_id: "order_test",
            razorpay_payment_id: "pay_test",
            razorpay_signature: "a".repeat(64),
          });
        });
      }

      close() {
        window.__razorpayEvents.push({ type: "close" });
        document.querySelector("[data-testid=mock-razorpay]")?.remove();
      }
    }

    Object.defineProperty(window, "Razorpay", {
      configurable: true,
      value: MockRazorpay,
    });
  });
}

async function mockPaymentApis(page: Page, verifyStatus = 200) {
  let orderRequests = 0;
  await page.route("**/api/razorpay/order", async (route) => {
    orderRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        keyId: "rzp_test_mock",
        orderId: `order_test_${orderRequests}`,
        amount: 189900,
        currency: "INR",
      }),
    });
  });
  await page.route("**/api/razorpay/verify", async (route) => {
    await route.fulfill({
      status: verifyStatus,
      contentType: "application/json",
      body: JSON.stringify(
        verifyStatus === 200
          ? { reference: "ALC-0123456789ABCDEF0123456789ABCDEF" }
          : { error: "failed" },
      ),
    });
  });
  await page.route("**/api/orders/ALC-*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        order: {
          reference: "ALC-0123456789ABCDEF0123456789ABCDEF",
          status: "paid",
          itemCount: 1,
          amount: 189900,
          currency: "INR",
        },
      }),
    }),
  );
  return () => orderRequests;
}

async function addProductAndReview(page: Page) {
  await page.goto("/");
  await expect(page.locator("html[data-store-hydrated=true]")).toHaveCount(1);
  const addButton = page.getByRole("button", { name: "Add Morning Slice to cart" });
  await addButton.click();
  await expect(page.locator("[data-cart-sheet][data-state=open]")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__razorpayEvents.length)).toBe(0);
  await page.getByRole("button", { name: "Review order" }).click();
}

test.beforeEach(async ({ page }) => {
  await mockRazorpay(page);
});

test("closes the Radix sheet before opening a tappable Razorpay checkout", async ({ page }) => {
  await mockPaymentApis(page);
  await addProductAndReview(page);
  await page.getByRole("button", { name: /Pay ₹/ }).click();

  await expect(page.getByTestId("mock-razorpay")).toBeVisible();
  const openEvent = await page.evaluate(() =>
    window.__razorpayEvents.find((event) => event.type === "open"),
  );
  expect(openEvent).toMatchObject({
    type: "open",
    bodyPointerEvents: "auto",
    openCartSheets: 0,
  });

  await page.getByTestId("mock-dismiss").click();
  await expect(
    page.getByText("Payment window closed. You can try again when you’re ready."),
  ).toBeVisible();
  await expect(page.locator("[data-cart-sheet][data-state=open]")).toHaveCount(0);
});

test("blocks duplicate launches and allows a retry after dismissal", async ({ page }) => {
  const orderRequestCount = await mockPaymentApis(page);
  await addProductAndReview(page);
  const payButton = page.getByRole("button", { name: /Pay ₹/ });
  await payButton.dblclick();

  await expect(page.getByTestId("mock-razorpay")).toBeVisible();
  expect(orderRequestCount()).toBe(1);
  await page.getByTestId("mock-dismiss").click();

  await page.getByRole("button", { name: /Open cart with 1 item/ }).click();
  await page.getByRole("button", { name: "Review order" }).click();
  await page.getByRole("button", { name: /Pay ₹/ }).click();
  await expect(page.getByTestId("mock-razorpay")).toBeVisible();
  expect(orderRequestCount()).toBe(2);
});

test("shows verification failure outside the sheet and succeeds on retry", async ({ page }) => {
  await mockPaymentApis(page, 500);
  await addProductAndReview(page);
  await page.getByRole("button", { name: /Pay ₹/ }).click();
  await page.getByTestId("mock-confirm").click();

  await expect(
    page
      .locator("div[role=alert]")
      .filter({ hasText: "The payment could not be verified. No order has been confirmed." }),
  ).toBeVisible();
  await expect(page.locator("[data-cart-sheet][data-state=open]")).toHaveCount(0);

  await page.unroute("**/api/razorpay/verify");
  await page.route("**/api/razorpay/verify", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reference: "ALC-0123456789ABCDEF0123456789ABCDEF" }),
    }),
  );
  await page.getByRole("button", { name: /Open cart with 1 item/ }).click();
  await page.getByRole("button", { name: "Review order" }).click();
  await page.getByRole("button", { name: /Pay ₹/ }).click();
  await page.getByTestId("mock-confirm").click();

  await expect(page).toHaveURL(/\/thank-you\?reference=ALC-/);
  await expect(page.getByRole("heading", { name: "Thank you for your purchase" })).toBeVisible();
});

test("cancels a slow order request when the cart is closed", async ({ page }) => {
  let releaseOrder: () => void = () => undefined;
  const orderGate = new Promise<void>((resolve) => {
    releaseOrder = resolve;
  });
  await page.route("**/api/razorpay/order", async (route) => {
    await orderGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        keyId: "rzp_test_mock",
        orderId: "order_stale",
        amount: 189900,
        currency: "INR",
      }),
    });
  });

  await addProductAndReview(page);
  await page.getByRole("button", { name: /Pay ₹/ }).click();
  await expect(page.getByRole("button", { name: "Opening secure checkout…" })).toBeDisabled();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  releaseOrder();

  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.__razorpayEvents)).toEqual([]);
  await expect(page.locator("[data-cart-sheet][data-state=open]")).toHaveCount(0);
});

test("keeps the cart and route unchanged until verification succeeds", async ({ page }) => {
  let releaseVerification: () => void = () => undefined;
  const verificationGate = new Promise<void>((resolve) => {
    releaseVerification = resolve;
  });
  await page.route("**/api/razorpay/order", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        keyId: "rzp_test_mock",
        orderId: "order_delayed_verification",
        amount: 189900,
        currency: "INR",
      }),
    }),
  );
  await page.route("**/api/razorpay/verify", async (route) => {
    await verificationGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reference: "ALC-0123456789ABCDEF0123456789ABCDEF" }),
    });
  });
  await page.route("**/api/orders/ALC-*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        order: {
          reference: "ALC-0123456789ABCDEF0123456789ABCDEF",
          status: "paid",
          itemCount: 1,
          amount: 189900,
          currency: "INR",
        },
      }),
    }),
  );

  await addProductAndReview(page);
  await page.getByRole("button", { name: /Pay ₹/ }).click();
  await page.getByTestId("mock-confirm").click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: /Open cart with 1 item/ })).toBeVisible();

  releaseVerification();
  await expect(page).toHaveURL(/\/thank-you\?reference=ALC-/);
  await expect(page.getByRole("button", { name: /Open cart with 0 items/ })).toBeVisible();
});
