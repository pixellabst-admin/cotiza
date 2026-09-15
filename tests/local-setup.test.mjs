import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const source = new URL("../scripts/setup-local.mjs", import.meta.url);

test("local setup generates private credentials and never overwrites existing configuration", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cotiza-local-test-"));
  try {
    const scripts = path.join(directory, "scripts");
    await mkdir(scripts);
    const script = path.join(scripts, "setup-local.mjs");
    await copyFile(source, script);
    const previewFile = path.join(directory, ".env");
    const previewContent = "# Preview configuration must remain unchanged\nEXAMPLE=preserve-me\n";
    await writeFile(previewFile, previewContent);

    // Use another working directory to check resolution relative to the script itself.
    const run = () => spawnSync(process.execPath, [script], { cwd: tmpdir(), encoding: "utf8" });
    const first = run();
    assert.equal(first.status, 0, first.stderr);

    const file = path.join(directory, ".env.local");
    const content = await readFile(file, "utf8");
    const values = Object.fromEntries(content.split("\n").filter((line) => line && !line.startsWith("#")).map((line) => {
      const position = line.indexOf("=");
      return [line.slice(0, position), line.slice(position + 1)];
    }));
    assert.match(values.POSTGRES_PASSWORD, /^[a-f0-9]{48}$/);
    const connection = new URL(values.DATABASE_URL);
    assert.equal(connection.protocol, "postgresql:");
    assert.equal(connection.hostname, "127.0.0.1");
    assert.equal(connection.port, values.POSTGRES_PORT);
    assert.equal(connection.username, values.POSTGRES_USER);
    assert.equal(connection.password, values.POSTGRES_PASSWORD);
    assert.equal(connection.pathname, `/${values.POSTGRES_DB}`);
    assert.ok(!first.stdout.includes(values.POSTGRES_PASSWORD), "Credentials must not be printed");
    assert.equal(await readFile(previewFile, "utf8"), previewContent);
    if (process.platform !== "win32") assert.equal((await stat(file)).mode & 0o077, 0, "Only the owner should have access");

    const second = run();
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /Se conserva sin modificar/);
    assert.equal(await readFile(file, "utf8"), content);
    assert.equal(await readFile(previewFile, "utf8"), previewContent);
    assert.ok(!second.stdout.includes(values.POSTGRES_PASSWORD));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
