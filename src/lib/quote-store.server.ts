import { randomUUID } from "node:crypto";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { quoteSubmitLimits, quotes } from "../../drizzle/schema";
import { getDatabase } from "./database.server";

export type StoredQuoteRow = typeof quotes.$inferSelect;
export type NewQuoteRow = typeof quotes.$inferInsert;

export async function insertQuote(row: NewQuoteRow) {
  try {
    await getDatabase().insert(quotes).values(row);
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    )
      return false;
    throw new Error("Unable to save quote", { cause: error });
  }
}

export async function findQuote(quoteId: string) {
  const rows = await getDatabase()
    .select()
    .from(quotes)
    .where(eq(quotes.quoteId, quoteId))
    .limit(1);
  return rows[0] ?? null;
}

export async function claimSubmission(quoteId: string, claimedAt: string, staleBefore: string) {
  const token = randomUUID();
  const rows = await getDatabase()
    .update(quotes)
    .set({ submissionClaimedAt: claimedAt, submissionClaimToken: token })
    .where(
      and(
        eq(quotes.quoteId, quoteId),
        isNull(quotes.submittedAt),
        or(isNull(quotes.submissionClaimedAt), lt(quotes.submissionClaimedAt, staleBefore)),
      ),
    )
    .returning({ token: quotes.submissionClaimToken });
  return rows[0]?.token ?? null;
}

export async function consumeSubmitRateLimit(
  key: string,
  now: number,
  windowMs = 60_000,
  limit = 10,
) {
  const result = await getDatabase().execute<{ allowed: boolean }>(sql`
    insert into ${quoteSubmitLimits} (limiter_key, window_started_at, request_count)
    values (${key}, ${now}, 1)
    on conflict (limiter_key) do update set
      window_started_at = case
        when ${now} - ${quoteSubmitLimits.windowStartedAt} >= ${windowMs} then ${now}
        else ${quoteSubmitLimits.windowStartedAt}
      end,
      request_count = case
        when ${now} - ${quoteSubmitLimits.windowStartedAt} >= ${windowMs} then 1
        else ${quoteSubmitLimits.requestCount} + 1
      end
    returning request_count <= ${limit} as allowed
  `);
  return result[0]?.allowed ?? false;
}

export async function finalizeSubmission(
  quoteId: string,
  claimToken: string,
  values: Pick<
    NewQuoteRow,
    | "payload"
    | "customer"
    | "submittedAt"
    | "status"
    | "lastError"
    | "submissionClaimedAt"
    | "submissionClaimToken"
  >,
) {
  const rows = await getDatabase()
    .update(quotes)
    .set(values)
    .where(and(eq(quotes.quoteId, quoteId), eq(quotes.submissionClaimToken, claimToken)))
    .returning();
  return rows[0] ?? null;
}

export async function failDelivery(quoteId: string, claimToken: string, message: string) {
  await getDatabase()
    .update(quotes)
    .set({
      status: "delivery_failed",
      lastError: message.slice(0, 200),
      submissionClaimedAt: null,
      submissionClaimToken: null,
    })
    .where(and(eq(quotes.quoteId, quoteId), eq(quotes.submissionClaimToken, claimToken)));
}

export async function setQuoteStatus(quoteId: string, status: string) {
  const rows = await getDatabase()
    .update(quotes)
    .set({ status })
    .where(eq(quotes.quoteId, quoteId))
    .returning();
  return rows[0] ?? null;
}
