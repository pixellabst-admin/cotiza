import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const source = new URL("../iniciar-local.sh", import.meta.url);
const commands = [
  "docker info",
  "node scripts/setup-local.mjs",
  "npm install",
  "docker compose --env-file .env.local up -d --wait",
  "npx drizzle-kit push",
  "npm run dev -- --hostname 127.0.0.1",
];

async function fixture(run) {
  const directory = await mkdtemp(path.join(tmpdir(), "cotiza-launcher-test-"));
  try {
    const binaryDirectory = path.join(directory, "fake-bin");
    await mkdir(binaryDirectory);
    await copyFile(source, path.join(directory, "iniciar-local.sh"));
    const logfile = path.join(directory, "commands.log");
    for (const executable of ["docker", "node", "npm", "npx"]) {
      const script = `#!/usr/bin/env bash\ncommand="${executable} $*"\nprintf '%s\\n' "$command" >> "$TEST_LOG"\nif [[ "$command" == "\${FAIL_STEP:-}" ]]; then exit 35; fi\n`;
      await writeFile(path.join(binaryDirectory, executable), script, { mode: 0o700 });
    }
    const execute = (failStep = "") => spawnSync("bash", [path.join(directory, "iniciar-local.sh")], {
      cwd: tmpdir(),
      encoding: "utf8",
      env: { ...process.env, PATH: `${binaryDirectory}${path.delimiter}${process.env.PATH || ""}`, TEST_LOG: logfile, FAIL_STEP: failStep },
    });
    await run({ directory, execute, log: async () => (await readFile(logfile, "utf8")).trim().split("\n") });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const options = { skip: process.platform === "win32" };

test("local shell launcher runs setup, database and application in order", options, async () => {
  await fixture(async ({ execute, log }) => {
    const result = execute();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(await log(), commands);
    assert.match(result.stdout, /http:\/\/localhost:3000/);
  });
});

test("local shell launcher keeps installed dependencies on later starts", options, async () => {
  await fixture(async ({ directory, execute, log }) => {
    await mkdir(path.join(directory, "node_modules", "next"), { recursive: true });
    await writeFile(path.join(directory, "node_modules", "next", "package.json"), "{}");
    const result = execute();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(await log(), commands.filter((command) => command !== "npm install"));
  });
});

test("local shell launcher stops before schema changes when Docker startup fails", options, async () => {
  await fixture(async ({ execute, log }) => {
    const result = execute(commands[3]);
    assert.equal(result.status, 35);
    assert.deepEqual(await log(), commands.slice(0, 4));
    assert.match(result.stderr, /No se pudo completar el inicio/);
  });
});
