import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { customers, sales } from "@/db/schema";
import { ensureSchema } from "@/lib/ensure-schema";
import { money, formatDate } from "@/lib/utils";
import { businessSettings } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comprobante de pago", robots: { index: false, follow: false } };

const pay = { cash: "Efectivo", transfer: "Transferencia bancaria", card: "Tarjeta", other: "Otro" } as const;

export default async function ReceiptPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  await ensureSchema();
  const [sale] = await db.select().from(sales).where(eq(sales.number, number)).limit(1);
  if (!sale || sale.status !== "paid") notFound();
  const [customer] = sale.customerId ? await db.select().from(customers).where(eq(customers.id, sale.customerId)).limit(1) : [];
  const [business] = await db.select().from(businessSettings).limit(1);
  const currency = business?.currency || "MXN";
  const rawSubtotal = sale.items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPrice * 100), 0);
  const discountCents = Math.round(rawSubtotal * (Number(sale.discountPercent || 0) / 100));
  return (
    <div className="public-page">
      <header className="public-header"><span><strong>{business?.name || "Comprobante de pago"}</strong></span><span>{sale.number}</span></header>
      <main className="public-main">
        <article className="quote-document receipt-document">
          <header className="document-header">
            <div>
              <strong>{business?.name || "Tu negocio"}</strong>
              {business?.email && <span>{business.email}</span>}
              {business?.phone && <span>{business.phone}</span>}
            </div>
            <div className="document-number"><span>COMPROBANTE DE PAGO</span><strong>{sale.number}</strong></div>
          </header>
          <p>Fecha: {formatDate(sale.soldAt, true)}</p>
          <p>Recibí de: <strong>{sale.customerName || customer?.name || "Cliente"}</strong></p>
          <p>Forma de pago: <strong>{pay[sale.paymentMethod as keyof typeof pay]}</strong></p>
          <table className="document-table">
            <thead><tr><th>Concepto</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr></thead>
            <tbody>{sale.items.map((item, index) => <tr key={index}><td>{item.description}</td><td>{item.quantity}</td><td>{money(Math.round(item.unitPrice * 100), currency)}</td><td>{money(Math.round(item.unitPrice * item.quantity * 100), currency)}</td></tr>)}</tbody>
            <tfoot>
              <tr><td colSpan={3}>Subtotal</td><td>{money(sale.subtotalCents, currency)}</td></tr>
              {discountCents > 0 && <tr><td colSpan={3}>Descuento ({Number(sale.discountPercent || 0)}%)</td><td>-{money(discountCents, currency)}</td></tr>}
              <tr><td colSpan={3}>IVA ({sale.taxRate}%)</td><td>{money(sale.taxCents, currency)}</td></tr>
              <tr><td colSpan={3}><strong>Total pagado</strong></td><td><strong>{money(sale.totalCents, currency)}</strong></td></tr>
            </tfoot>
          </table>
          <div className="receipt-stamp">CANCELADO</div>
          <div className="receipt-legal">
            <strong>Documento no fiscal</strong>
            <p>Este documento no es un comprobante fiscal. Solo confirma la recepción del pago y los detalles indicados; no sustituye factura, ticket fiscal ni recibo autorizado por la autoridad correspondiente.</p>
          </div>
        </article>
      </main>
    </div>
  );
}
