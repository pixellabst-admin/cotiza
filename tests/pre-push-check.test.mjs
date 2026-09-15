import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const source = new URL("../scripts/revisar-antes-de-subir.mjs", import.meta.url);
const ignoreRules = "node_modules/\n.next/\n.env\n.env.*\n!.env.example\n";
const hasGit = spawnSync("git", ["--version"]).status === 0;

async function project({ ignore = ignoreRules, files = {}, initGit = false, track = [] } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), "cotiza-prepush-"));
  await mkdir(path.join(directory, "scripts"));
  await mkdir(path.join(directory, "src", "db"), { recursive: true });
  await copyFile(source, path.join(directory, "scripts", "revisar-antes-de-subir.mjs"));
  await writeFile(path.join(directory, "package.json"), "{}");
  await writeFile(path.join(directory, "drizzle.web.config.ts"), "");
  await writeFile(path.join(directory, "src", "db", "schema.ts"), "");
  if (ignore !== null) await writeFile(path.join(directory, ".gitignore"), ignore);
  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(directory, name), content);
  }
  if (initGit) {
    const run = (...args) => spawnSync("git", args, { cwd: directory, encoding: "utf8" });
    run("init", "-q");
    run("config", "user.email", "test@example.invalid");
    run("config", "user.name", "Test");
    if (track.length) run("add", "-f", ...track);
  }
  const result = spawnSync(process.execPath, [path.join(directory, "scripts", "revisar-antes-de-subir.mjs")], {
    cwd: tmpdir(),
    encoding: "utf8",
  });
  return { directory, result };
}

test("approves a clean project and shows the next commands", async () => {
  const { directory, result } = await project({ files: { ".env.local": "DATABASE_URL=postgresql://user@127.0.0.1:5433/db\n" } });
  try {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Sin contraseñas ni archivos privados/);
    assert.match(result.stdout, /git push -u origin main/);
    assert.match(result.stdout, /\.env\.local/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("stops when the ignore rules do not protect environment files", async () => {
  const { directory, result } = await project({ ignore: "node_modules/\n" });
  try {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no protege los archivos \.env/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("stops when git already tracks a private file, without printing its contents", { skip: !hasGit }, async () => {
  const password = "not_a_real_secret_1357";
  const { directory, result } = await project({
    files: { ".env.local": `DATABASE_URL=postgresql://user:${password}@127.0.0.1:5433/db\n` },
    initGit: true,
    track: [".env.local"],
  });
  try {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /archivos privados/);
    assert.match(result.stderr, /git rm --cached/);
    assert.ok(!`${result.stdout}${result.stderr}`.includes(password), "Must never print credentials");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("warns about the downloadable source bundle and keeps the repository unchanged", { skip: !hasGit }, async () => {
  const { directory, result } = await project({ initGit: true });
  try {
    await mkdir(path.join(directory, "public", "descargas"), { recursive: true });
    await writeFile(path.join(directory, "public", "descargas", "cotiza-local.zip"), "PK");
    const again = spawnSync(process.execPath, [path.join(directory, "scripts", "revisar-antes-de-subir.mjs")], { cwd: tmpdir(), encoding: "utf8" });
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /copia descargable del código/);
    const status = spawnSync("git", ["status", "--porcelain"], { cwd: directory, encoding: "utf8" });
    assert.ok(!status.stdout.includes("??  "), "The checker must not stage or commit anything");
    const log = spawnSync("git", ["log", "--oneline"], { cwd: directory, encoding: "utf8" });
    // Without commits git log exits non-zero; with commits the output must still be empty.
    if (log.status === 0) assert.equal(log.stdout.trim(), "", "The checker must not create commits");
    assert.equal(result.status, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
