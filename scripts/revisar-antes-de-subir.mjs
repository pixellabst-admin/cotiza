// Read-only safety check before publishing the project to GitHub.
// It never runs git commands that modify the repository and never prints secret values.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const problems = [];
const warnings = [];
const notes = [];

function git(...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) return null;
  return result.stdout;
}

// 1. Private files that must never reach the repository.
const privateFiles = [".env", ".env.local", ".env.web.local", ".env.production", ".env.production.local"];
const presentPrivateFiles = privateFiles.filter((name) => existsSync(path.join(root, name)));

// 2. The ignore rules must exist and cover those files.
const ignorePath = path.join(root, ".gitignore");
if (!existsSync(ignorePath)) {
  problems.push("Falta el archivo .gitignore. Sin él, tus contraseñas podrían subirse a GitHub.");
} else {
  const rules = readFileSync(ignorePath, "utf8");
  if (!/^\s*\.env(\.\*)?\s*$/m.test(rules)) {
    problems.push("El archivo .gitignore no protege los archivos .env. Restaura el .gitignore original del proyecto.");
  }
  if (!/^\s*node_modules\/?\s*$/m.test(rules)) {
    warnings.push("El archivo .gitignore no excluye node_modules. El envío sería innecesariamente pesado.");
  }
}

// 3. Inspect what git would actually publish.
const isRepository = git("rev-parse", "--is-inside-work-tree")?.trim() === "true";
if (!isRepository) {
  notes.push("Todavía no has ejecutado git init. Hazlo siguiendo el paso 1.6 de SUBIR-A-INTERNET.txt.");
} else {
  const tracked = (git("ls-files") ?? "").split("\n").filter(Boolean);
  const exposedEnv = tracked.filter((file) => path.basename(file).startsWith(".env") && path.basename(file) !== ".env.example");
  if (exposedEnv.length) {
    problems.push(`Git ya está siguiendo archivos privados: ${exposedEnv.join(", ")}. Quítalos con "git rm --cached NOMBRE" antes de subir. Si ya los enviaste, cambia esas contraseñas.`);
  }
  const heavy = tracked.filter((file) => file.startsWith("node_modules/") || file.startsWith(".next/"));
  if (heavy.length) {
    problems.push("Git está siguiendo node_modules o .next. Revisa tu .gitignore y quítalos del envío.");
  }
  const ignoredCheck = spawnSync("git", ["check-ignore", "-q", ".env.local"], { cwd: root });
  if (existsSync(path.join(root, ".env.local")) && ignoredCheck.status !== 0) {
    problems.push("Git no está ignorando .env.local. No continúes hasta corregir el .gitignore.");
  }
  if (!tracked.length) notes.push("Aún no has añadido archivos con git add. Continúa con el paso 1.6.");
}

// 4. The downloadable copy of the source code is optional in a production repository.
const bundle = path.join(root, "public", "descargas", "cotiza-local.zip");
if (existsSync(bundle)) {
  const megabytes = statSync(bundle).size / 1024 / 1024;
  warnings.push(`public/descargas/cotiza-local.zip (${megabytes.toFixed(1)} MB) es una copia descargable del código y quedaría pública en tu sitio. Bórralo si no quieres ofrecerlo.`);
}

// 5. Required project files.
for (const required of ["package.json", "drizzle.web.config.ts", "src/db/schema.ts"]) {
  if (!existsSync(path.join(root, required))) {
    problems.push(`No encuentro ${required}. Ejecuta este verificador dentro de la carpeta del proyecto.`);
  }
}

console.log("\n  REVISIÓN ANTES DE SUBIR A GITHUB\n");

if (presentPrivateFiles.length) {
  console.log("  Archivos privados detectados en tu computadora:");
  for (const file of presentPrivateFiles) console.log(`    - ${file}`);
  console.log("  Deben quedarse aquí. No se subirán mientras .gitignore los proteja.\n");
}

for (const note of notes) console.log(`  · ${note}`);
for (const warning of warnings) console.log(`  ! Atención: ${warning}`);

if (problems.length) {
  console.log("");
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error("\n  Corrige lo anterior antes de subir el proyecto.\n");
  process.exit(1);
}

console.log("\n  ✓ Sin contraseñas ni archivos privados en el envío.\n");
console.log("  Siguientes pasos (sustituye TU-USUARIO por tu usuario de GitHub):\n");
console.log("    git add .");
console.log("    git status");
console.log('    git commit -m "Primera version de Cotiza"');
console.log("    git branch -M main");
console.log("    git remote add origin https://github.com/TU-USUARIO/cotiza.git");
console.log("    git push -u origin main\n");
console.log("  La guía completa está en SUBIR-A-INTERNET.txt.\n");
