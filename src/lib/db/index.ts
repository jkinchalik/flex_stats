import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DbClient = NeonHttpDatabase<typeof schema>;

let cached: DbClient | undefined;

function init(): DbClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (and your deployment env).",
    );
  }
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

// Proxy so importing `db` doesn't trigger a connection during `next build`.
// Each property access lazily initializes the real client on first use.
export const db = new Proxy({} as DbClient, {
  get(_, prop, receiver) {
    cached ??= init();
    const value = Reflect.get(cached, prop, receiver);
    return typeof value === "function" ? value.bind(cached) : value;
  },
});

export type Db = DbClient;
