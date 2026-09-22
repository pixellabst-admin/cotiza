import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quotes } from "@/db/schema";
import { getPublicQuote } from "@/lib/data";
import { addDays, dateInput } from "@/lib/utils";
import { and, eq, inArray, gte } from "drizzle-orm";
import { z } from "zod";

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const input = z.object({
      action: z.enum(["accept", "reject", "review"]).default("accept"),
      name: z.string().trim().min(2, "Escribe tu nombre completo").max(180),
      note: z.string().trim().max(500).optional().default(""),
    }).safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message || "Escribe tu nombre completo para confirmar" }, { status: 400 });
    const data = await getPublicQuote(token);
    if (!data) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    const today = dateInput();
    const current = data.quote.status;
    if (current === "accepted" && input.data.action === "accept") return NextResponse.json({ ok: true, alreadyAccepted: true, status: "accepted" });
    if (current === "rejected" && input.data.action === "reject") return NextResponse.json({ ok: true, status: "rejected" });
    if (current === "archived" || current === "expired" || current === "draft") {
      return NextResponse.json({ error: "Esta cotización ya no admite una decisión. Contacta al emisor." }, { status: 400 });
    }
    if (data.quote.validUntil < today && input.data.action !== "review") {
      return NextResponse.json({ error: "El plazo de esta cotización venció." }, { status: 400 });
    }
    const open = ["sent", "review"] as const;
    if (!open.includes(current as "sent" | "review")) {
      return NextResponse.json({ error: "Esta cotización no está disponible para una decisión." }, { status: 400 });
    }

    if (input.data.action === "review") {
      const [updated] = await db.update(quotes).set({
        status: "review",
        validUntil: dateInput(addDays(new Date(), 15)),
        acceptedBy: input.data.name,
        decisionNote: input.data.note || "El cliente pidió 15 días de revisión.",
      }).where(and(eq(quotes.shareToken, token), inArray(quotes.status, ["sent", "review"]))).returning();
      if (!updated) return NextResponse.json({ error: "La cotización cambió. Actualiza la página." }, { status: 409 });
      return NextResponse.json({ ok: true, status: "review", validUntil: updated.validUntil });
    }

    const nextStatus = input.data.action === "accept" ? "accepted" : "rejected";
    const [updated] = await db.update(quotes).set({
      status: nextStatus,
      acceptedBy: input.data.name,
      decisionNote: input.data.note || "",
    }).where(and(eq(quotes.shareToken, token), inArray(quotes.status, ["sent", "review"]), gte(quotes.validUntil, today))).returning();
    if (!updated) return NextResponse.json({ error: "La cotización cambió. Actualiza la página." }, { status: 409 });
    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    console.error("Public decision failed", error);
    return NextResponse.json({ error: "No pudimos registrar tu decisión. Inténtalo de nuevo." }, { status: 500 });
  }
}
