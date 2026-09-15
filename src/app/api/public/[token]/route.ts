import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quotes } from "@/db/schema";
import { getPublicQuote } from "@/lib/data";
import { dateInput } from "@/lib/utils";
import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const input = z.object({ name: z.string().trim().min(2, "Escribe tu nombre completo").max(180) }).safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: "Escribe tu nombre completo para confirmar" }, { status: 400 });
    const data = await getPublicQuote(token);
    if (!data) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    if (data.quote.status === "accepted") return NextResponse.json({ ok: true, alreadyAccepted: true });
    if (data.quote.status !== "sent" || data.quote.validUntil < dateInput()) return NextResponse.json({ error: "Esta cotización no está disponible para aceptar. Contacta al emisor." }, { status: 400 });
    const [updated] = await db.update(quotes).set({ status: "accepted", acceptedBy: input.data.name }).where(and(eq(quotes.shareToken, token), eq(quotes.status, "sent"), gte(quotes.validUntil, dateInput()))).returning();
    if (!updated) return NextResponse.json({ error: "La cotización cambió. Actualiza la página." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Public acceptance failed", error);
    return NextResponse.json({ error: "No pudimos registrar tu aceptación. Inténtalo de nuevo." }, { status: 500 });
  }
}
