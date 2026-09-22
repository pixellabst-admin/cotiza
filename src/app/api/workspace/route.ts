import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businessSettings, customers, quotes } from "@/db/schema";
import { ensureSeed, getAppData } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { addDays, calculateTotals, dateInput } from "@/lib/utils";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";
const unauthorized = () => NextResponse.json({ error: "Tu sesión terminó. Vuelve a iniciar sesión." }, { status: 401 });
const idSchema = z.number().int().positive();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida").refine((value) => !isNaN(Date.parse(value)) && new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value, "La fecha no es válida");
const quoteSchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(2, "Escribe un título para la cotización").max(240),
  customerId: idSchema,
  issueDate: dateSchema,
  validUntil: dateSchema,
  items: z.array(z.object({ description: z.string().trim().min(1, "Describe cada concepto").max(500), quantity: z.number().positive("La cantidad debe ser mayor a cero").max(10000), unitPrice: z.number().min(0).max(1000000) })).min(1).max(40),
  taxRate: z.number().min(0).max(100),
  discountPercent: z.number().min(0).max(100),
  notes: z.string().max(5000),
  status: z.enum(["draft", "sent", "accepted", "expired"]).default("draft"),
}).refine((value) => value.validUntil >= value.issueDate, { message: "La vigencia no puede ser anterior a la fecha de emisión", path: ["validUntil"] });
const customerSchema = z.object({
  id: idSchema.optional(), name: z.string().trim().min(2, "Escribe el nombre del cliente").max(180), contact: z.string().trim().max(180),
  email: z.union([z.literal(""), z.string().email("Escribe un correo válido").max(240)]),
  phone: z.string().trim().max(40).refine((value) => !value || /^[+\d\s()-]+$/.test(value) && value.replace(/\D/g, "").length >= 8 && value.replace(/\D/g, "").length <= 15, "Escribe un teléfono válido con código de país"),
  color: z.enum(["mint", "lavender", "peach", "sage", "pink", "blue"]).default("mint"),
});
const businessSchema = z.object({
  name: z.string().trim().min(2).max(180), ownerName: z.string().trim().min(2).max(180), email: z.string().email("Escribe un correo válido").max(240), phone: z.string().max(40), address: z.string().max(500), currency: z.enum(["MXN", "USD", "EUR", "COP", "ARS", "CLP", "PEN"]), taxRate: z.number().min(0).max(100), terms: z.string().max(5000),
});

export async function GET() {
  try {
    if (!(await getSessionUser())) return unauthorized();
    return NextResponse.json({ data: await getAppData() });
  }
  catch (error) { console.error("Workspace read failed", error); return NextResponse.json({ error: "No pudimos cargar tus datos. Inténtalo de nuevo." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getSessionUser())) return unauthorized();
    await ensureSeed();
    const body = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    let resultId: number | undefined;
    switch (body.action) {
      case "saveQuote": {
        const input = quoteSchema.parse(body);
        const [customer] = await db.select().from(customers).where(eq(customers.id, input.customerId));
        if (!customer) throw new Error("El cliente seleccionado no existe");
        const { discountCents: _discount, ...totals } = calculateTotals(input.items, input.taxRate, input.discountPercent);
        if (totals.totalCents > 1000000000 || totals.subtotalCents > 1000000000) throw new Error("El importe máximo por cotización es de 10 millones");
        const { id, ...values } = input;
        if (id) {
          const [existing] = await db.select().from(quotes).where(eq(quotes.id, id));
          if (!existing) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
          if (existing.status === "accepted") throw new Error("Duplica esta cotización para modificarla; la original ya fue aceptada");
          await db.update(quotes).set({ ...values, ...totals, status: existing.status }).where(eq(quotes.id, id));
          resultId = id;
        } else {
          const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.id, 1));
          await db.transaction(async (tx) => {
            const [created] = await tx.insert(quotes).values({ ...values, ...totals, status: "draft", currency: settings.currency, number: `NEW-${randomUUID()}` }).returning();
            await tx.update(quotes).set({ number: `COT-${String(created.id).padStart(4, "0")}` }).where(eq(quotes.id, created.id));
            resultId = created.id;
          });
        }
        break;
      }
      case "duplicateQuote": {
        const id = idSchema.parse(body.id);
        const [existing] = await db.select().from(quotes).where(eq(quotes.id, id));
        if (!existing) throw new Error("Cotización no encontrada");
        const { id: _id, number: _number, shareToken: _token, createdAt: _created, acceptedBy: _accepted, ...rest } = existing;
        await db.transaction(async (tx) => {
          const [created] = await tx.insert(quotes).values({ ...rest, title: `${existing.title.slice(0, 230)} (copia)`, number: `NEW-${randomUUID()}`, status: "draft", sharedVia: [], issueDate: dateInput(), validUntil: dateInput(addDays(new Date(), 15)) }).returning();
          await tx.update(quotes).set({ number: `COT-${String(created.id).padStart(4, "0")}` }).where(eq(quotes.id, created.id));
          resultId = created.id;
        });
        break;
      }
      case "setStatus": {
        const { id, status } = z.object({ id: idSchema, status: z.enum(["draft", "sent", "accepted", "expired"]) }).parse(body);
        const [existing] = await db.select().from(quotes).where(eq(quotes.id, id));
        if (!existing) throw new Error("Cotización no encontrada");
        if (status === "sent" && existing.validUntil < dateInput()) throw new Error("Actualiza la vigencia antes de marcar esta cotización como enviada");
        await db.update(quotes).set({ status, acceptedBy: status === "accepted" ? "Confirmado por el negocio" : null }).where(eq(quotes.id, id));
        resultId = id;
        break;
      }
      case "recordShare": {
        const { id, channel } = z.object({ id: idSchema, channel: z.enum(["whatsapp", "email"]) }).parse(body);
        const [existing] = await db.select().from(quotes).where(eq(quotes.id, id));
        if (!existing) throw new Error("Cotización no encontrada");
        const markSent = existing.status === "draft" && existing.validUntil >= dateInput();
        await db.update(quotes).set({
          sharedVia: sql`case when ${quotes.sharedVia} @> ${JSON.stringify([channel])}::jsonb then ${quotes.sharedVia} else ${quotes.sharedVia} || ${JSON.stringify([channel])}::jsonb end`,
          ...(markSent ? { status: "sent" as const } : {}),
        }).where(eq(quotes.id, id));
        resultId = id;
        break;
      }
      case "deleteQuote": {
        const id = idSchema.parse(body.id);
        await db.delete(quotes).where(eq(quotes.id, id));
        break;
      }
      case "saveCustomer": {
        const { id, ...values } = customerSchema.parse(body);
        if (id) {
          const [updated] = await db.update(customers).set(values).where(eq(customers.id, id)).returning();
          if (!updated) throw new Error("Cliente no encontrado");
          resultId = id;
        } else {
          const [created] = await db.insert(customers).values(values).returning();
          resultId = created.id;
        }
        break;
      }
      case "deleteCustomer": {
        const id = idSchema.parse(body.id);
        const [used] = await db.select({ id: quotes.id }).from(quotes).where(eq(quotes.customerId, id)).limit(1);
        if (used) throw new Error("Este cliente tiene cotizaciones. Elimínalas antes de eliminar el cliente.");
        await db.delete(customers).where(eq(customers.id, id));
        break;
      }
      case "saveSettings": {
        const values = businessSchema.parse(body);
        await db.update(businessSettings).set(values).where(eq(businessSettings.id, 1));
        break;
      }
      default: return NextResponse.json({ error: "Operación no reconocida" }, { status: 400 });
    }
    return NextResponse.json({ data: await getAppData(), resultId });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Revisa los datos del formulario" }, { status: 400 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    console.error("Workspace mutation failed", error);
    return NextResponse.json({ error: error instanceof Error && !error.message.includes("query:") ? error.message : "No pudimos guardar los cambios. Inténtalo de nuevo." }, { status: 400 });
  }
}
