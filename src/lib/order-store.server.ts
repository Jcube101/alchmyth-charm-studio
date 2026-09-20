import { and, eq, isNull } from "drizzle-orm";
import { orders } from "../../drizzle/schema";
import { getDatabase } from "./database.server";

export type OrderItemSnapshot = {
  slug: string;
  name: string;
  quantity: number;
  unitAmount: number;
  lineAmount: number;
};

export type StoredOrder = Omit<typeof orders.$inferSelect, "items"> & {
  items: OrderItemSnapshot[];
};

type NewOrder = Omit<typeof orders.$inferInsert, "items"> & {
  items: OrderItemSnapshot[];
};

export class OrderConflictError extends Error {
  constructor(message = "This payment is already associated with another order.") {
    super(message);
    this.name = "OrderConflictError";
  }
}

export class OrderPersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "OrderPersistenceError";
  }
}

function isUniqueViolation(error: unknown) {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

function asStoredOrder(row: typeof orders.$inferSelect): StoredOrder {
  return { ...row, items: row.items as OrderItemSnapshot[] };
}

export async function insertPendingOrder(row: NewOrder) {
  try {
    const inserted = await getDatabase().insert(orders).values(row).returning();
    if (!inserted[0]) throw new Error("The pending order was not returned after insert.");
    return asStoredOrder(inserted[0]);
  } catch (error) {
    if (isUniqueViolation(error)) throw new OrderConflictError("Order reference already exists.");
    throw new OrderPersistenceError("Unable to save the pending order.", { cause: error });
  }
}

export async function attachRazorpayOrder(id: string, razorpayOrderId: string, updatedAt: string) {
  try {
    const rows = await getDatabase()
      .update(orders)
      .set({ razorpayOrderId, updatedAt, lastError: null })
      .where(and(eq(orders.id, id), eq(orders.status, "pending"), isNull(orders.razorpayOrderId)))
      .returning();
    return rows[0] ? asStoredOrder(rows[0]) : null;
  } catch (error) {
    if (isUniqueViolation(error)) throw new OrderConflictError("Razorpay order is already linked.");
    throw new OrderPersistenceError("Unable to associate the payment order.", { cause: error });
  }
}

export async function recordOrderError(id: string, message: string, updatedAt: string) {
  await getDatabase()
    .update(orders)
    .set({ lastError: message.slice(0, 300), updatedAt })
    .where(and(eq(orders.id, id), eq(orders.status, "pending")));
}

export async function findOrderByRazorpayOrderId(razorpayOrderId: string) {
  const rows = await getDatabase()
    .select()
    .from(orders)
    .where(eq(orders.razorpayOrderId, razorpayOrderId))
    .limit(1);
  return rows[0] ? asStoredOrder(rows[0]) : null;
}

export async function findOrderByReference(reference: string) {
  const rows = await getDatabase()
    .select()
    .from(orders)
    .where(eq(orders.reference, reference))
    .limit(1);
  return rows[0] ? asStoredOrder(rows[0]) : null;
}

export async function markOrderPaid(
  id: string,
  razorpayPaymentId: string,
  providerPaymentStatus: string,
  paidAt: string,
) {
  try {
    const rows = await getDatabase()
      .update(orders)
      .set({
        status: "paid",
        fulfillmentStatus: "unfulfilled",
        razorpayPaymentId,
        providerPaymentStatus,
        paidAt,
        updatedAt: paidAt,
        lastError: null,
      })
      .where(and(eq(orders.id, id), eq(orders.status, "pending"), isNull(orders.razorpayPaymentId)))
      .returning();
    if (rows[0]) return asStoredOrder(rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) throw new OrderConflictError();
    throw new OrderPersistenceError("Unable to save the verified payment.", { cause: error });
  }

  const currentRows = await getDatabase().select().from(orders).where(eq(orders.id, id)).limit(1);
  const current = currentRows[0] ? asStoredOrder(currentRows[0]) : null;
  if (
    current?.status === "paid" &&
    current.razorpayPaymentId === razorpayPaymentId &&
    current.providerPaymentStatus === providerPaymentStatus
  )
    return current;
  throw new OrderConflictError("Order was already paid with a different payment.");
}
