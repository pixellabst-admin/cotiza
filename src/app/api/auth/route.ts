import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  checkSetupCode, clearFailures, endSession, hashPassword, hasAdministrator,
  recordFailure, startSession, tooManyAttempts, verifyPassword,
} from "@/lib/auth";
import { ensureSchema } from "@/lib/ensure-schema";

export const dynamic = "force-dynamic";

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido").max(240),
  password: z.string().min(1, "Escribe tu contraseña").max(200),
});
const setupSchema = credentials.extend({
  name: z.string().trim().min(2, "Escribe tu nombre").max(180),
  password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres").max(200),
  setupCode: z.string().max(200).default(""),
});

function clientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "logout") {
      await endSession();
      return NextResponse.json({ ok: true });
    }

    const key = clientKey(request);
    if (tooManyAttempts(key)) {
      return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." }, { status: 429 });
    }

    if (action === "setup") {
      const input = setupSchema.parse(body);
      if (await hasAdministrator()) {
        return NextResponse.json({ error: "El acceso ya fue creado. Inicia sesión con tu correo y contraseña." }, { status: 409 });
      }
      if (!checkSetupCode(input.setupCode)) {
        recordFailure(key);
        return NextResponse.json({ error: "El código de instalación no es correcto." }, { status: 403 });
      }
      const passwordHash = await hashPassword(input.password);
      const [created] = await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(73194823)`);
        const [existing] = await tx.select({ id: adminUsers.id }).from(adminUsers).limit(1);
        if (existing) return [];
        return tx.insert(adminUsers).values({ email: input.email, name: input.name, passwordHash }).returning();
      });
      if (!created) {
        return NextResponse.json({ error: "El acceso ya fue creado. Inicia sesión con tu correo y contraseña." }, { status: 409 });
      }
      clearFailures(key);
      await startSession(created.id);
      return NextResponse.json({ ok: true });
    }

    if (action === "login") {
      const input = credentials.parse(body);
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, input.email));
      const valid = user ? await verifyPassword(input.password, user.passwordHash) : false;
      if (!user || !valid) {
        recordFailure(key);
        return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
      }
      clearFailures(key);
      await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
      await startSession(user.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Operación no reconocida" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Revisa los datos del formulario" }, { status: 400 });
    }
    console.error("Authentication failed", error);
    return NextResponse.json({ error: "No pudimos completar la operación. Inténtalo de nuevo." }, { status: 500 });
  }
}
