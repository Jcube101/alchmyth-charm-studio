import { describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  insert: vi.fn(),
}));

vi.mock("./database.server", () => ({
  getDatabase: () => database,
}));

import { insertPendingOrder } from "./order-store.server";

describe("order persistence failures", () => {
  it("fails explicitly when the pending order cannot be saved", async () => {
    database.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.reject(new Error("database unavailable")),
      }),
    });

    await expect(
      insertPendingOrder({
        reference: "ALC-FAILURE0000001",
        status: "pending",
        fulfillmentStatus: "not_ready",
        items: [
          {
            slug: "morning-slice",
            name: "Morning Slice",
            quantity: 1,
            unitAmount: 189_900,
            lineAmount: 189_900,
          },
        ],
        amount: 189_900,
        currency: "INR",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow("Unable to save the pending order.");
  });
});
