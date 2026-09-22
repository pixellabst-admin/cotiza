import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businessSettings, quotes } from "@/db/schema";
import { formatQuoteNumber } from "./utils";

export async function allocateQuoteNumber(tx: Pick<typeof db, "select" | "update">, prefix: string, start: number) {
  let next = Math.max(1, Math.floor(start) || 1);
  for (let attempt = 0; attempt < 10000; attempt += 1) {
    const number = formatQuoteNumber(prefix, next);
    const [taken] = await tx.select({ id: quotes.id }).from(quotes).where(eq(quotes.number, number)).limit(1);
    if (!taken) {
      await tx.update(businessSettings).set({ quotePrefix: formatQuoteNumber(prefix, 1).split("-")[0], nextQuoteNumber: next + 1 }).where(eq(businessSettings.id, 1));
      return number;
    }
    next += 1;
  }
  throw new Error("No encontramos un número de cotización libre. Cambia el prefijo o el próximo número.");
}
