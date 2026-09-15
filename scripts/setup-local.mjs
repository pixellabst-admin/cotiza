import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const majorVersion = Number(process.versions.node.split(".")[0]);
if (majorVersion < 22) {
  console.error("Instala Node.js 22 o superior antes de preparar Cotiza.");
  process.exit(1);
}

const target = fileURLToPath(new URL("../.env.local", import.meta.url));
const password = randomBytes(24).toString("hex");
const content = [
  "# Configuración privada para usar Cotiza en tu computadora.",
  "# Generada por scripts/setup-local.mjs. No compartir ni subir a Git.",
  "# El puerto 5433 evita conflictos con PostgreSQL instalado en el puerto habitual.",
  "POSTGRES_USER=cotiza",
  "POSTGRES_DB=cotiza_local",
  `POSTGRES_PASSWORD=${password}`,
  "POSTGRES_PORT=5433",
  `DATABASE_URL=postgresql://cotiza:${password}@127.0.0.1:5433/cotiza_local`,
  "",
].join("\n");

try {
  await writeFile(target, content, { flag: "wx", mode: 0o600 });
  console.log("Listo: .env.local creado con una contraseña aleatoria para PostgreSQL.");
  console.log("La configuración .env de la vista previa no se ha modificado.");
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
    console.log("Ya existe .env.local. Se conserva sin modificar para proteger tu configuración.");
    console.log("Si usas tu propio PostgreSQL, revisa DATABASE_URL y omite el paso de Docker.");
  } else {
    console.error("No pudimos crear .env.local. Revisa los permisos de la carpeta.");
    process.exit(1);
  }
}

console.log("\nSiguientes pasos, desde la carpeta del proyecto:");
console.log("  npm install");
console.log("  docker compose --env-file .env.local up -d --wait");
console.log("  npx drizzle-kit push");
console.log("  npm run dev -- --hostname 127.0.0.1");
console.log("\nDespués abre http://localhost:3000 en tu navegador.");
console.log("La guía completa está en README.md.");
