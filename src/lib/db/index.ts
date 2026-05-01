import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

type DbClient = NodePgDatabase<typeof schema>;

let cached: DbClient | undefined;

function init(): DbClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (and your deployment env).",
    );
  }
  const pool = new Pool({
    connectionString: databaseUrl,
    // Railway public URLs require SSL; node-postgres reads sslmode from the URL,
    // but some networks need rejectUnauthorized=false to accept Railway's cert.
    ssl: databaseUrl.includes("sslmode=disable")
      ? false
      : { rejectUnauthorized: false },
  });
  return drizzle(pool, { schema });
}

export const db = new Proxy({} as DbClient, {
  get(_, prop, receiver) {
    cached ??= init();
    const value = Reflect.get(cached, prop, receiver);
    return typeof value === "function" ? value.bind(cached) : value;
  },
});

export type Db = DbClient;
