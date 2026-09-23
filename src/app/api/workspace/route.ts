import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businessSettings, customers, quotes, sales } from "@/db/schema";
import { ensureSeed, getAppData } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { addDays, calculateTotals, dateInput } from "@/lib/utils";
import { allocateQuoteNumber } from "@/lib/quote-number";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";
const unauthorized = () => NextResponse.json({ error: "Tu sesión terminó. Vuelve a iniciar sesión." }, { status: 401 });
const idSchema = z.number().int().positive();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida").refine((value) => !isNaN(Date.parse(value)) && new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value, "La fecha no es válida");
const quoteStatusSchema = z.enum(["draft", "sent", "review", "changes", "accepted", "rejected", "expired", "archived"]);
const quoteSchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(2, "Escribe un título para la cotización").max(240),
  customerId: idSchema,
  issueDate: dateSchema,
  validUntil: dateSchema,
  items: z.array(z.object({ description: z.string().trim().min(1, "Describe cada concepto").max(500), quantity: z.number().positive("La cantidad debe ser mayor a cero").max(10000), unitPrice: z.number().min(0).max(1000000), photo: z.string().max(900000).refine((value) => !value || value.startsWith("data:image/"), "La foto debe ser una imagen").optional().default("") })).min(1).max(40),
  taxRate: z.number().min(0).max(100),
  discountPercent: z.number().min(0).max(100),
  notes: z.string().max(5000),
  status: quoteStatusSchema.default("draft"),
}).refine((value) => value.validUntil >= value.issueDate, { message: "La vigencia no puede ser anterior a la fecha de emisión", path: ["validUntil"] });
const customerSchema = z.object({
  id: idSchema.optional(), name: z.string().trim().min(2, "Escribe el nombre del cliente").max(180), contact: z.string().trim().max(180),
  email: z.union([z.literal(""), z.string().email("Escribe un correo válido").max(240)]),
  phone: z.string().trim().max(40).refine((value) => !value || /^[+\d\s()-]+$/.test(value) && value.replace(/\D/g, "").length >= 8 && value.replace(/\D/g, "").length <= 15, "Escribe un teléfono válido con código de país"),
  color: z.enum(["mint", "lavender", "peach", "sage", "pink", "blue"]).default("mint"),
});
const businessSchema = z.object({
  name: z.string().trim().min(2).max(180), ownerName: z.string().trim().min(2).max(180), email: z.string().email("Escribe un correo válido").max(240), phone: z.string().max(40), address: z.string().max(500), currency: z.enum(["MXN", "USD", "EUR", "COP", "ARS", "CLP", "PEN"]), taxRate: z.number().min(0).max(100), terms: z.string().max(5000),
  quotePrefix: z.string().trim().min(1).max(12).regex(/^[A-Za-z0-9-]+$/, "El prefijo solo admite letras, números y guiones"),
  nextQuoteNumber: z.number().int().min(1).max(999999),
  logoData: z.string().max(900000, "El logo es demasiado grande.").refine((value) => value === "" || value.startsWith("data:image/"), "El logo debe ser una imagen").optional().default(""),
  website: z.string().trim().max(240).optional().default(""),
  facebook: z.string().trim().max(240).optional().default(""),
  instagram: z.string().trim().max(240).optional().default(""),
  tiktok: z.string().trim().max(240).optional().default(""),
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
            const number = await allocateQuoteNumber(tx, settings.quotePrefix, settings.nextQuoteNumber);
            const [created] = await tx.insert(quotes).values({ ...values, ...totals, status: "draft", currency: settings.currency, number }).returning();
            resultId = created.id;
          });
        }
        break;
      }
      case "duplicateQuote": {
        const id = idSchema.parse(body.id);
        const [existing] = await db.select().from(quotes).where(eq(quotes.id, id));
        if (!existing) throw new Error("Cotización no encontrada");
        const { id: _id, number: _number, shareToken: _token, createdAt: _created, acceptedBy: _accepted, thankYouMessage: _thanks, thankYouPhoto: _photo, thankYouToken: _thanksToken, ...rest } = existing;
        const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.id, 1));
        await db.transaction(async (tx) => {
          const number = await allocateQuoteNumber(tx, settings.quotePrefix, settings.nextQuoteNumber);
          const [created] = await tx.insert(quotes).values({ ...rest, title: `${existing.title.slice(0, 230)} (copia)`, number, status: "draft", sharedVia: [], acceptedBy: null, decisionNote: "", issueDate: dateInput(), validUntil: dateInput(addDays(new Date(), 15)) }).returning();
          resultId = created.id;
        });
        break;
      }
      case "setStatus": {
        const { id, status } = z.object({ id: idSchema, status: quoteStatusSchema }).parse(body);
        const [existing] = await db.select().from(quotes).where(eq(quotes.id, id));
        if (!existing) throw new Error("Cotización no encontrada");
        const today = dateInput();
        const patch: Partial<typeof quotes.$inferInsert> = { status };
        if ((status === "sent" || status === "review") && existing.validUntil < today) patch.validUntil = dateInput(addDays(new Date(), 15));
        if (status === "review") patch.validUntil = dateInput(addDays(new Date(), 15));
        if (status === "accepted") patch.acceptedBy = existing.acceptedBy || "Confirmado por el negocio";
        if (status === "rejected") patch.acceptedBy = existing.acceptedBy || "Rechazada por el negocio";
        await db.update(quotes).set(patch).where(eq(quotes.id, id));
        resultId = id;
        break;
      }
      case "recordShare": {
        const { id, channel } = z.object({ id: idSchema, channel: z.enum(["whatsapp", "email"]) }).parse(body);
        const [existing] = await db.select().from(quotes).where(eq(quotes.id, id));
        if (!existing) throw new Error("Cotización no encontrada");
        const today = dateInput();
        const becomesSent = existing.status === "draft" || existing.status === "review";
        await db.update(quotes).set({
          sharedVia: sql`case when ${quotes.sharedVia} @> ${JSON.stringify([channel])}::jsonb then ${quotes.sharedVia} else ${quotes.sharedVia} || ${JSON.stringify([channel])}::jsonb end`,
          ...(becomesSent ? { status: "sent" as const, validUntil: existing.validUntil < today ? dateInput(addDays(new Date(), 15)) : existing.validUntil } : {}),
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
      case "saveThankYou": {
        const input = z.object({
          id: idSchema,
          message: z.string().trim().min(8, "Escribe un mensaje de agradecimiento").max(2000),
          photo: z.string().max(900000).refine((value) => value === "" || value.startsWith("data:image/"), "La foto debe ser una imagen").optional().default(""),
        }).parse(body);
        const [existing] = await db.select().from(quotes).where(eq(quotes.id, input.id));
        if (!existing) throw new Error("Cotización no encontrada");
        await db.update(quotes).set({ thankYouMessage: input.message, thankYouPhoto: input.photo }).where(eq(quotes.id, input.id));
        resultId = input.id;
        break;
      }
      case "resetQuoteNumbers": {
        await db.update(businessSettings).set({ nextQuoteNumber: 1 }).where(eq(businessSettings.id, 1));
        break;
      }
      case "saveSale": {
        const input = z.object({
          id: idSchema.optional(),
          customerId: z.number().int().positive().optional().nullable(),
          customerName: z.string().trim().min(2, "Escribe el nombre del cliente o del comprador").max(180),
          soldAt: dateSchema,
          items: z.array(z.object({ description: z.string().trim().min(1).max(500), quantity: z.number().positive().max(10000), unitPrice: z.number().min(0).max(1000000) })).min(1).max(40),
          taxRate: z.number().min(0).max(100),
          paymentMethod: z.enum(["cash", "transfer", "card", "other"]),
          status: z.enum(["paid", "pending", "cancelled"]),
          notes: z.string().max(2000),
          quoteId: z.number().int().positive().optional().nullable(),
        }).parse(body);
        const { discountCents: _d, ...totals } = calculateTotals(input.items, input.taxRate, 0);
        const { id, ...values } = input;
        if (id) {
          await db.update(sales).set({ ...values, ...totals }).where(eq(sales.id, id));
          resultId = id;
        } else {
          await db.transaction(async (tx) => {
            const existing = await tx.select({ number: sales.number }).from(sales);
            let max = 0;
            for (const row of existing) {
              const match = row.number.match(/(\d+)$/);
              if (match) max = Math.max(max, Number(match[1]));
            }
            const [created] = await tx.insert(sales).values({ ...values, ...totals, number: `VTA-${String(max + 1).padStart(4, "0")}` }).returning();
            resultId = created.id;
          });
        }
        break;
      }
      case "deleteSale": {
        const id = idSchema.parse(body.id);
        await db.delete(sales).where(eq(sales.id, id));
        break;
      }
      case "saleFromQuote": {
        const id = idSchema.parse(body.id);
        const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
        if (!quote) throw new Error("Cotización no encontrada");
        if (quote.status !== "accepted") throw new Error("Solo las cotizaciones aprobadas se pueden convertir en venta");
        const [already] = await db.select({ id: sales.id }).from(sales).where(eq(sales.quoteId, quote.id)).limit(1);
        if (already) throw new Error("Esta cotización ya tiene una venta registrada");
        const [customer] = await db.select().from(customers).where(eq(customers.id, quote.customerId));
        await db.transaction(async (tx) => {
          const existing = await tx.select({ number: sales.number }).from(sales);
          let max = 0;
          for (const row of existing) {
            const match = row.number.match(/(\d+)$/);
            if (match) max = Math.max(max, Number(match[1]));
          }
          const [created] = await tx.insert(sales).values({
            number: `VTA-${String(max + 1).padStart(4, "0")}`,
            customerId: quote.customerId,
            customerName: customer?.name || "Cliente",
            soldAt: dateInput(),
            items: quote.items,
            subtotalCents: quote.subtotalCents,
            taxCents: quote.taxCents,
            totalCents: quote.totalCents,
            taxRate: quote.taxRate,
            paymentMethod: "transfer",
            status: "paid",
            notes: `Desde ${quote.number} · ${quote.title}`,
            quoteId: quote.id,
          }).returning();
          resultId = created.id;
        });
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
