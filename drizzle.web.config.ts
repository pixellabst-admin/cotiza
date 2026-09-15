import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Deliberately do not load .env or .env.local: they belong to local development.
config({ path: ".env.web.local", quiet: true });

const databaseUrl = process.env.WEB_DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("Falta WEB_DATABASE_URL en .env.web.local. Consulta PUBLICAR-WEB.md. La conexión local no se utilizará como alternativa.");
}

let parsed: URL;
try {
  parsed = new URL(databaseUrl);
} catch {
  throw new Error("WEB_DATABASE_URL no tiene un formato de URL válido. Copia la conexión PostgreSQL de tu proveedor sin compartirla.");
}

if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
  throw new Error("WEB_DATABASE_URL debe ser una conexión PostgreSQL, no una dirección de una página web.");
}
const host = parsed.hostname.toLowerCase();
if (!host || host === "localhost" || host.endsWith(".localhost") || host.startsWith("127.") || ["0.0.0.0", "::1", "[::1]", "::", "[::]"].includes(host)) {
  throw new Error("La configuración web no admite localhost. Usa la conexión de la base en la nube; para desarrollo local utiliza drizzle.config.ts.");
}
if (!parsed.username || parsed.pathname === "/" || !parsed.pathname) {
  throw new Error("La conexión PostgreSQL debe indicar usuario y nombre de base de datos.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url: databaseUrl },
});
