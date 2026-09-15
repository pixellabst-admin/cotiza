import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { adminUsers, appSecrets } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ensureSchema } from "@/lib/ensure-schema";

const scrypt = promisify(scryptCallback);
const COOKIE = "cotiza_session";
const SESSION_HOURS = 12;
const KEY_LENGTH = 64;

export type SessionUser = { id: number; email: string; name: string };

/** Password hashing with a per-password random salt. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const derived = (await scrypt(password.normalize("NFKC"), Buffer.from(saltHex, "hex"), KEY_LENGTH)) as Buffer;
  return timingSafeEqual(derived, expected);
}

/**
 * Signing key for session cookies. AUTH_SECRET takes precedence; otherwise a
 * random key is generated once and stored, so sessions survive restarts.
 */
let cachedSecret: string | undefined;
async function getSessionSecret() {
  const fromEnvironment = process.env.AUTH_SECRET?.trim();
  if (fromEnvironment) {
    if (fromEnvironment.length < 32) throw new Error("AUTH_SECRET debe tener al menos 32 caracteres.");
    return fromEnvironment;
  }
  if (cachedSecret) return cachedSecret;
  await ensureSchema();
  const secret = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(73194822)`);
    const [existing] = await tx.select().from(appSecrets).where(eq(appSecrets.id, 1));
    if (existing) return existing.sessionSecret;
    const [created] = await tx.insert(appSecrets).values({ id: 1, sessionSecret: randomBytes(48).toString("hex") }).returning();
    return created.sessionSecret;
  });
  cachedSecret = secret;
  return secret;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

async function createToken(userId: number) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + SESSION_HOURS * 3600_000 })).toString("base64url");
  return `${payload}.${sign(payload, await getSessionSecret())}`;
}

async function readToken(token: string): Promise<number | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, await getSessionSecret());
  const given = Buffer.from(signature);
  const valid = Buffer.from(expected);
  if (given.length !== valid.length || !timingSafeEqual(given, valid)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub?: number; exp?: number };
    if (typeof data.sub !== "number" || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data.sub;
  } catch {
    return null;
  }
}

async function cookieOptions() {
  const proto = (await headers()).get("x-forwarded-proto") || "";
  const https = proto.split(",")[0]?.trim() === "https";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: https,
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  };
}

export async function startSession(userId: number) {
  const store = await cookies();
  store.set(COOKIE, await createToken(userId), await cookieOptions());
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** Returns the signed-in administrator, or null. Safe to call from pages and routes. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return null;
    const userId = await readToken(token);
    if (!userId) return null;
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));
    return user ? { id: user.id, email: user.email, name: user.name } : null;
  } catch (error) {
    console.error("Session verification failed", error);
    return null;
  }
}

export async function hasAdministrator() {
  await ensureSchema();
  const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  return Boolean(existing);
}

/** True when the first-run form must ask for ADMIN_SETUP_CODE. */
export function setupCodeRequired() {
  return Boolean(process.env.ADMIN_SETUP_CODE?.trim());
}

export function checkSetupCode(given: string) {
  const expected = process.env.ADMIN_SETUP_CODE?.trim();
  if (!expected) return true;
  const a = Buffer.from(given.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Small in-memory throttle. Resets on restart and is per server instance. */
const attempts = new Map<string, { count: number; until: number }>();
export function tooManyAttempts(key: string) {
  const entry = attempts.get(key);
  return Boolean(entry && entry.count >= 8 && entry.until > Date.now());
}
export function recordFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.until < now) attempts.set(key, { count: 1, until: now + 900_000 });
  else attempts.set(key, { count: entry.count + 1, until: entry.until });
  if (attempts.size > 500) for (const [id, value] of attempts) if (value.until < now) attempts.delete(id);
}
export function clearFailures(key: string) {
  attempts.delete(key);
}
