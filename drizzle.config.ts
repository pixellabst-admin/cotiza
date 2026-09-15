import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Match Next.js local development precedence while preserving externally set values.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL. Ejecuta node scripts/setup-local.mjs o configura tu conexión en .env.local.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url: databaseUrl },
});
