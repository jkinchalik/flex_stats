import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL must be set for drizzle-kit.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url, ssl: { rejectUnauthorized: false } },
});
