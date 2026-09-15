import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const code = await readFile(new URL("../drizzle.web.config.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(code, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function loadConfig(environment = {}, fileEnvironment = {}) {
  const env = { ...environment };
  const loadedPaths = [];
  const module = { exports: {} };
  runInNewContext(compiled, {
    module,
    exports: module.exports,
    URL,
    process: { env },
    require(name) {
      if (name === "drizzle-kit") return { defineConfig: (value) => value };
      if (name === "dotenv") return {
        config(options) {
          loadedPaths.push(options.path);
          assert.equal(options.quiet, true);
          for (const [key, value] of Object.entries(fileEnvironment)) {
            if (env[key] === undefined) env[key] = value;
          }
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { timeout: 1000 });
  return { config: module.exports.default, loadedPaths, environment: env };
}

const cloudUrl = "postgresql://test_user:fake_test_password@database.example.invalid/cotiza?sslmode=require";

test("cloud configuration only loads its dedicated private environment file", () => {
  const result = loadConfig({ DATABASE_URL: "postgresql://local_user@127.0.0.1:5433/local_db" }, { WEB_DATABASE_URL: cloudUrl });
  assert.deepEqual(result.loadedPaths, [".env.web.local"]);
  assert.equal(result.config.dialect, "postgresql");
  assert.equal(result.config.schema, "./src/db/schema.ts");
  assert.equal(result.config.dbCredentials.url, cloudUrl);
  assert.equal(result.environment.DATABASE_URL, "postgresql://local_user@127.0.0.1:5433/local_db");
});

test("cloud configuration does not silently fall back to DATABASE_URL", () => {
  assert.throws(() => loadConfig({ DATABASE_URL: cloudUrl }), /Falta WEB_DATABASE_URL/);
});

test("cloud configuration refuses invalid URLs, HTTP, missing database and common loopback addresses", () => {
  const invalidUrls = [
    "not a connection",
    "https://database.example.invalid/cotiza",
    "postgresql://test_user@database.example.invalid/",
    "postgresql://database.example.invalid/cotiza",
    "postgresql://test_user@localhost/cotiza",
    "postgresql://test_user@db.localhost/cotiza",
    "postgresql://test_user@127.0.0.1/cotiza",
    "postgresql://test_user@127.0.0.2/cotiza",
    "postgresql://test_user@0.0.0.0/cotiza",
    "postgresql://test_user@[::1]/cotiza",
  ];
  for (const value of invalidUrls) {
    assert.throws(() => loadConfig({ WEB_DATABASE_URL: value }), undefined, `Must reject ${value}`);
  }
});

test("explicit cloud environment has priority and URL whitespace is removed", () => {
  const result = loadConfig({ WEB_DATABASE_URL: `  ${cloudUrl}  ` }, { WEB_DATABASE_URL: "postgresql://other_user@other.example.invalid/other" });
  assert.equal(result.config.dbCredentials.url, cloudUrl);
});

test("configuration errors do not disclose connection credentials", () => {
  const password = "not_a_real_secret_2468";
  try {
    loadConfig({ WEB_DATABASE_URL: `postgresql://test_user:${password}@localhost/cotiza` });
    assert.fail("Must reject the local connection");
  } catch (error) {
    assert.ok(!String(error).includes(password));
    assert.match(String(error), /configuración web no admite localhost/);
  }
});
