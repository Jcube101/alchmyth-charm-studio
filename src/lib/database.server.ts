import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../drizzle/schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDatabase() {
  if (database) return database;
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("Database is not configured.");
  const client = postgres(url, { max: 5, prepare: false });
  database = drizzle(client, { schema });
  return database;
}
