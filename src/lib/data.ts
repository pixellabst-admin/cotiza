import { db } from "@/db";
import { businessSettings, customers, quotes } from "@/db/schema";
import type { QuoteItem, QuoteStatus, ShareChannel } from "@/db/schema";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { addDays, calculateTotals, dateInput, effectiveStatus } from "./utils";
import { ensureSchema } from "./ensure-schema";
import type { AppData, Quote } from "./types";

let seedPromise: Promise<void> | undefined;

export function ensureSeed() {
  if (!seedPromise) {
    seedPromise = seedWorkspace().catch((error) => { seedPromise = undefined; throw error; });
  }
  return seedPromise;
}

async function seedWorkspace() {
  await ensureSchema();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(73194821)`);
    const [existing] = await tx.select().from(businessSettings).where(eq(businessSettings.id, 1));
    if (existing) return;
    const [settings] = await tx.insert(businessSettings).values({
      id: 1,
      name: "Estudio Creativo",
      ownerName: "Alejandro Morales",
      email: "hola@estudiocreativo.mx",
      phone: "+52 55 1234 5678",
      address: "Ciudad de México, México",
      currency: "MXN",
      taxRate: 16,
      terms: "Cotización válida por 15 días. Se requiere un anticipo del 50% para iniciar el proyecto. El saldo se liquida contra entrega. Los tiempos de entrega se acuerdan al confirmar el proyecto.",
    }).returning();
    const clients = await tx.insert(customers).values([
      { name: "Estudio Forma", contact: "Mariana Rodríguez", email: "mariana@estudioforma.mx", phone: "+52 55 2345 6789", color: "lavender" },
      { name: "Café Botánico", contact: "Pablo Sánchez", email: "pablo@cafebotanico.mx", phone: "+52 55 3456 7890", color: "mint" },
      { name: "Nova Tech", contact: "Andrés Martínez", email: "andres@novatech.mx", phone: "+52 55 4567 8901", color: "peach" },
      { name: "Casa Oliva", contact: "Sofía Hernández", email: "sofia@casaoliva.mx", phone: "+52 55 5678 9012", color: "sage" },
      { name: "Daniela Torres", contact: "Diseñadora de interiores", email: "hola@danielatorres.mx", phone: "+52 55 6789 0123", color: "pink" },
      { name: "Grupo Horizonte", contact: "Roberto Díaz", email: "roberto@grupohorizonte.mx", phone: "+52 55 7890 1234", color: "blue" },
      { name: "Flor & Raíz", contact: "Isabel Castro", email: "isabel@floryraiz.mx", phone: "+52 55 8901 2345", color: "peach" },
      { name: "Marea Studio", contact: "Valeria Luna", email: "valeria@mareastudio.mx", phone: "+52 55 9012 3456", color: "blue" },
    ]).returning();
    const now = new Date();
    let number = 1;
    const rows: (typeof quotes.$inferInsert)[] = [];
    const historicalTotals = [48500, 78200, 62300, 98200, 113880];
    for (let month = 0; month < 5; month++) {
      for (let index = 0; index < 4; index++) {
        const issue = new Date(now.getFullYear(), now.getMonth() - 5 + month, 7 + index * 5);
        const amount = historicalTotals[month] * [0.34, 0.28, 0.23, 0.15][index];
        const items: QuoteItem[] = [{ description: ["Diseño y estrategia de marca", "Desarrollo de sitio web", "Contenido para redes sociales", "Consultoría creativa"][index], quantity: 1, unitPrice: Math.round(amount / 1.16 * 100) / 100 }];
        const totals = calculateTotals(items, 16, 0);
        rows.push({ number: `COT-${String(number++).padStart(4, "0")}`, title: items[0].description, customerId: clients[(month + index) % clients.length].id, issueDate: dateInput(issue), validUntil: dateInput(addDays(issue, 15)), status: index < 3 ? "accepted" : "expired", items, subtotalCents: totals.subtotalCents, taxCents: totals.taxCents, totalCents: totals.totalCents, taxRate: 16, notes: settings.terms, sharedVia: index % 2 === 0 ? ["whatsapp"] : ["email"], createdAt: issue });
      }
    }
    const amounts = [12500, 8900, 6500, 18500, 4200, 15800, 3600, 2800, 5200, 3100, 4600, 2100, 1900, 2800, 2400, 3600, 3800, 1850, 2200, 2800, 1850, 2700, 2100, 2650];
    const titles = ["Diseño de identidad visual", "Diseño y desarrollo web", "Gestión de redes sociales", "Branding y empaque", "Diseño de catálogo digital", "Estrategia de comunicación", "Sesión de fotografía", "Diseño de presentaciones", "Landing page de campaña", "Contenido para redes sociales", "Rediseño de logotipo", "Asesoría de marca", "Diseño de papelería", "Campaña de lanzamiento", "Edición de video", "Diseño editorial", "Tienda en línea", "Ilustración personalizada", "Producción de contenido", "Auditoría de marca", "Plantillas para redes", "Diseño de newsletter", "Retoque fotográfico", "Consultoría creativa"];
    const statuses: QuoteStatus[] = ["sent", "accepted", "sent", "accepted", "draft", "accepted", "sent", "sent", "accepted", "accepted", "accepted", "accepted", "sent", "accepted", "sent", "accepted", "accepted", "sent", "accepted", "sent", "accepted", "draft", "draft", "expired"];
    for (let index = 23; index >= 0; index--) {
      const issue = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - index));
      const items: QuoteItem[] = [{ description: titles[index], quantity: 1, unitPrice: Math.round(amounts[index] / 1.16 * 100) / 100 }];
      const totals = calculateTotals(items, 16, 0);
      const channels: ShareChannel[] = statuses[index] === "draft" ? [] : index % 3 === 0 ? ["whatsapp", "email"] : index % 3 === 1 ? ["whatsapp"] : ["email"];
      rows.push({ number: `COT-${String(number++).padStart(4, "0")}`, title: titles[index], customerId: clients[index % clients.length].id, issueDate: dateInput(issue), validUntil: dateInput(addDays(now, index === 23 ? -2 : 15 - Math.min(index, 13))), status: statuses[index], items, subtotalCents: totals.subtotalCents, taxCents: totals.taxCents, totalCents: totals.totalCents, taxRate: 16, notes: settings.terms, sharedVia: channels, createdAt: new Date(now.getTime() - index * 3600000) });
    }
    await tx.insert(quotes).values(rows);
    await tx.update(businessSettings).set({ quotePrefix: "COT", nextQuoteNumber: number }).where(eq(businessSettings.id, 1));
  });
}

export async function getAppData(): Promise<AppData> {
  await ensureSeed();
  await db.update(quotes).set({ status: "archived" }).where(and(inArray(quotes.status, ["sent", "review", "expired"]), lt(quotes.validUntil, dateInput())));
  const [allCustomers, allQuotes, [settings]] = await Promise.all([
    db.select().from(customers).orderBy(desc(customers.createdAt)),
    db.select().from(quotes).orderBy(desc(quotes.issueDate), desc(quotes.createdAt)),
    db.select().from(businessSettings).where(eq(businessSettings.id, 1)),
  ]);
  if (!settings) {
    seedPromise = undefined;
    await ensureSeed();
    const [created] = await db.select().from(businessSettings).where(eq(businessSettings.id, 1));
    if (!created) throw new Error("No pudimos preparar los datos de tu negocio. Ejecuta npx drizzle-kit push y vuelve a abrir Cotiza.");
    return getAppData();
  }
  return {
    customers: allCustomers.map((customer) => ({ ...customer, createdAt: customer.createdAt.toISOString() })),
    quotes: allQuotes.map((quote) => {
      const serialized: Quote = { ...quote, createdAt: quote.createdAt.toISOString() };
      return { ...serialized, status: effectiveStatus(serialized) };
    }),
    settings,
  };
}

export async function getPublicQuote(token: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null;
  await ensureSeed();
  const [quote] = await db.select().from(quotes).where(eq(quotes.shareToken, token));
  if (!quote) return null;
  const [[customer], [settings]] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, quote.customerId)),
    db.select().from(businessSettings).where(eq(businessSettings.id, 1)),
  ]);
  const serialized: Quote = { ...quote, createdAt: quote.createdAt.toISOString() };
  return { quote: { ...serialized, status: effectiveStatus(serialized) }, customer: { ...customer, createdAt: customer.createdAt.toISOString() }, settings };
}
