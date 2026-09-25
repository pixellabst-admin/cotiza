"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2, Pencil, ShoppingBag, TrendingUp, Receipt, Wallet, Sparkles, Download, Check, LoaderCircle, X, Banknote, CreditCard, ArrowLeftRight, CircleDot, FileText, Send } from "lucide-react";
import type { AppData, Customer, PaymentMethod, Quote, Sale, SaleItem, SaleStatus } from "@/lib/types";
import { calculateTotals, dateInput, formatDate, money } from "@/lib/utils";
import { Avatar, EmptyState, Modal } from "./ui";
import { ReceiptShareModal } from "./receipt-share-modal";

const payLabel: Record<PaymentMethod, string> = { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", other: "Otro" };
const statusLabel: Record<SaleStatus, string> = { paid: "Pagada", pending: "Por cobrar", cancelled: "Cancelada" };

export function SalesDesk({ data, periodPrefix, onSave, onDelete, onFromQuote, onExport, onReceipt }: {
  data: AppData;
  periodPrefix: string;
  onSave: (input: Omit<Sale, "id" | "number" | "createdAt" | "subtotalCents" | "taxCents" | "totalCents" | "discountPercent"> & { id?: number; discountPercent?: number }) => Promise<void>;
  onDelete: (sale: Sale) => void;
  onFromQuote: (quote: Quote) => Promise<void>;
  onExport: () => void;
  onReceipt: (sale: Sale) => void;
}) {
  const [editing, setEditing] = useState<Sale | "new" | null>(null);
  const [sharing, setSharing] = useState<Sale | null>(null);
  const currency = data.settings.currency;
  const monthSales = data.sales.filter((sale) => sale.soldAt.startsWith(periodPrefix) && sale.status !== "cancelled");
  const paid = monthSales.filter((sale) => sale.status === "paid");
  const pending = monthSales.filter((sale) => sale.status === "pending");
  const revenue = paid.reduce((sum, sale) => sum + sale.totalCents, 0);
  const pendingCents = pending.reduce((sum, sale) => sum + sale.totalCents, 0);
  const tickets = paid.length;
  const average = tickets ? Math.round(revenue / tickets) : 0;
  const previousPrefix = previousMonth(periodPrefix);
  const previousRevenue = data.sales.filter((sale) => sale.soldAt.startsWith(previousPrefix) && sale.status === "paid").reduce((sum, sale) => sum + sale.totalCents, 0);
  const change = previousRevenue ? (revenue - previousRevenue) / previousRevenue * 100 : 0;
  const today = dateInput();
  const todaySales = data.sales.filter((sale) => sale.soldAt === today && sale.status === "paid");
  const ranking = useMemo(() => rankProducts(monthSales), [monthSales]);
  const months = lastMonths(6);
  const monthTotals = months.map((month) => ({
    ...month,
    total: data.sales.filter((sale) => sale.soldAt.startsWith(month.key) && sale.status === "paid").reduce((sum, sale) => sum + sale.totalCents, 0),
  }));
  const maxMonth = Math.max(...monthTotals.map((item) => item.total), 1);
  const convertible = data.quotes.filter((quote) => quote.status === "accepted" && !data.sales.some((sale) => sale.quoteId === quote.id));

  return <div className="sales-desk">
    <div className="stats-grid">
      <section className="card stat-card"><div className="stat-heading"><span>Ingresos del período</span><span className="stat-icon mint-icon"><Wallet size={19} /></span></div><div className="stat-value"><strong>{money(revenue, currency, false)}</strong></div><div className="stat-footer"><span className={`trend-pill ${change < 0 ? "negative" : ""}`}><TrendingUp size={12} />{change >= 0 ? "+" : ""}{change.toFixed(1)}%</span><span>vs. período anterior</span></div></section>
      <section className="card stat-card"><div className="stat-heading"><span>Ventas cobradas</span><span className="stat-icon"><Receipt size={19} /></span></div><div className="stat-value"><strong>{tickets}</strong></div><div className="stat-footer"><span className="trend-pill">{money(average, currency, false)}</span><span>ticket promedio</span></div></section>
      <section className="card stat-card"><div className="stat-heading"><span>Por cobrar</span><span className="stat-icon amber-icon"><CircleDot size={19} /></span></div><div className="stat-value"><strong>{money(pendingCents, currency, false)}</strong></div><div className="stat-footer"><span className="amber-dot" /><span>{pending.length} {pending.length === 1 ? "venta pendiente" : "ventas pendientes"}</span></div></section>
      <section className="card stat-card"><div className="stat-heading"><span>Caja de hoy</span><span className="stat-icon"><Sparkles size={19} /></span></div><div className="stat-value"><strong>{money(todaySales.reduce((sum, sale) => sum + sale.totalCents, 0), currency, false)}</strong></div><div className="stat-footer"><span>{todaySales.length} {todaySales.length === 1 ? "movimiento" : "movimientos"}</span></div></section>
    </div>

    <div className="charts-grid">
      <section className="card activity-card sales-bars"><div className="card-heading"><div><h2>Pulso de Pixel Lab</h2><p>Lo cobrado en los últimos meses.</p></div></div><div className="sales-bar-row">{monthTotals.map((month) => <div key={month.key} className="sales-bar"><span className="sales-bar-fill" style={{ height: `${Math.max(8, month.total / maxMonth * 100)}%` }} /><strong>{money(month.total, currency, false)}</strong><small>{month.label}</small></div>)}</div></section>
      <section className="card status-card"><div className="card-heading"><div><h2>Lo que más se vende</h2><p>Conceptos del período.</p></div></div>{ranking.length ? <ol className="sales-rank">{ranking.slice(0, 5).map((item, index) => <li key={item.name}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.name}</strong><small>{item.qty} uds · {money(item.total, currency)}</small></div></li>)}</ol> : <p className="sales-empty-note">Registra tu primera venta y aquí florecerá el ranking.</p>}</section>
    </div>

    {convertible.length > 0 && <section className="card sales-convert"><div><Sparkles size={18} /><div><h3>Cotizaciones aprobadas listas para cobrar</h3><p>Un toque y se convierten en venta.</p></div></div><div className="sales-convert-list">{convertible.slice(0, 4).map((quote) => <button key={quote.id} className="button button-secondary button-sm" onClick={() => void onFromQuote(quote)}>{quote.number} · {money(quote.totalCents, quote.currency)}</button>)}</div></section>}

    <section className="card quotes-card"><div className="quotes-card-heading"><div className="heading-with-count"><h2>Libro de ventas</h2><span className="count-pill">{data.sales.length}</span></div><div className="heading-actions"><button className="button button-secondary button-sm" onClick={onExport}><Download size={15} />Exportar CSV</button><button className="button button-primary button-sm" onClick={() => setEditing("new")}><Plus size={15} />Registrar venta</button></div></div>
      <div className="table-scroll"><table className="quotes-table"><thead><tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>Pago</th><th>Estado</th><th className="amount-cell">Total</th><th aria-label="Acciones" /></tr></thead>
        <tbody>{data.sales.map((sale) => <tr key={sale.id}><td><strong>{sale.number}</strong><div className="quote-title-cell"><span>{sale.items[0]?.description}{sale.items.length > 1 ? ` +${sale.items.length - 1}` : ""}</span></div></td><td>{sale.customerName}</td><td className="date-cell">{formatDate(sale.soldAt, true)}</td><td>{payLabel[sale.paymentMethod]}</td><td><span className={`status-badge status-${sale.status === "paid" ? "accepted" : sale.status === "pending" ? "sent" : "draft"}`}><i />{statusLabel[sale.status]}</span></td><td className="amount-cell"><strong>{money(sale.totalCents, currency)}</strong></td><td><div className="row-actions">{sale.status === "paid" && <button className="icon-button" title="Comprobante de pago PDF" aria-label={`Comprobante de ${sale.number}`} onClick={() => onReceipt(sale)}><FileText size={15} /></button>}{sale.status === "paid" && <button className="icon-button" title="Enviar comprobante" aria-label={`Enviar comprobante ${sale.number}`} onClick={() => setSharing(sale)}><Send size={15} /></button>}<button className="icon-button" aria-label={`Editar ${sale.number}`} onClick={() => setEditing(sale)}><Pencil size={15} /></button><button className="icon-button danger-hover" aria-label={`Eliminar ${sale.number}`} onClick={() => onDelete(sale)}><Trash2 size={15} /></button></div></td></tr>)}</tbody>
      </table></div>
      {!data.sales.length && <EmptyState title="Tu primera venta está por escribirse" description="Registra un cobro, o convierte una cotización aprobada. El reporte mensual se arma solo." onAction={() => setEditing("new")} action="Registrar venta" />}
    </section>
    {editing && <SaleForm sale={editing === "new" ? undefined : editing} customers={data.customers} taxRate={data.settings.taxRate} currency={currency} onClose={() => setEditing(null)} onSave={async (input) => { await onSave(input); setEditing(null); }} />}
    {sharing && <ReceiptShareModal sale={sharing} customer={data.customers.find((customer) => customer.id === sharing.customerId)} business={data.settings} onClose={() => setSharing(null)} />}
  </div>;
}

function SaleForm({ sale, customers, taxRate, currency, onClose, onSave }: {
  sale?: Sale; customers: Customer[]; taxRate: number; currency: string;
  onClose: () => void;
  onSave: (input: Omit<Sale, "id" | "number" | "createdAt" | "subtotalCents" | "taxCents" | "totalCents" | "discountPercent"> & { id?: number; discountPercent?: number }) => Promise<void>;
}) {
  const [customerId, setCustomerId] = useState<number | "">(sale?.customerId ?? "");
  const [customerName, setCustomerName] = useState(sale?.customerName ?? "");
  const [soldAt, setSoldAt] = useState(sale?.soldAt ?? dateInput());
  const [items, setItems] = useState<SaleItem[]>(sale?.items?.length ? sale.items.map((item) => ({ ...item })) : [{ description: "", quantity: 1, unitPrice: 0 }]);
  const [rate, setRate] = useState(sale?.taxRate ?? taxRate);
  const [discountPercent, setDiscountPercent] = useState(sale?.discountPercent ?? 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(sale?.paymentMethod ?? "transfer");
  const [status, setStatus] = useState<SaleStatus>(sale?.status ?? "paid");
  const [notes, setNotes] = useState(sale?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const totals = calculateTotals(items, rate, discountPercent);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      await onSave({ id: sale?.id, customerId: customerId || null, customerName, soldAt, items, taxRate: rate, discountPercent, paymentMethod, status, notes, quoteId: sale?.quoteId ?? null });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "No pudimos guardar la venta");
      setSaving(false);
      return;
    }
    setSaving(false);
  }

  return <Modal wide title={sale ? `Editar ${sale.number}` : "Registrar una venta"} subtitle="Nombre, cantidad, precio. El reporte se escribe solo." onClose={() => { if (!saving) onClose(); }}>
    <form onSubmit={submit}>
      <div className="modal-body">
        <div className="form-grid">
          <label className="form-field">Cliente en tu agenda<select value={customerId} onChange={(event) => { const value = event.target.value ? Number(event.target.value) : ""; setCustomerId(value); const found = customers.find((customer) => customer.id === value); if (found) setCustomerName(found.name); }}><option value="">Venta de mostrador</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <label className="form-field">Nombre en el ticket<input required minLength={2} maxLength={180} value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Quién pagó" /></label>
          <label className="form-field">Fecha de venta<input required type="date" value={soldAt} onChange={(event) => setSoldAt(event.target.value)} /></label>
          <label className="form-field">Forma de pago<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}><option value="transfer">Transferencia</option><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="other">Otro</option></select></label>
        </div>
        <div className="item-editor" style={{ marginTop: 18 }}>
          {items.map((item, index) => <div className="item-grid" key={index}>
            <input required maxLength={500} placeholder="Producto o servicio" value={item.description} onChange={(event) => setItems(items.map((row, position) => position === index ? { ...row, description: event.target.value } : row))} />
            <input type="number" min={0.01} step="0.01" value={item.quantity} onChange={(event) => setItems(items.map((row, position) => position === index ? { ...row, quantity: Number(event.target.value) } : row))} />
            <div className="currency-input"><span>$</span><input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(event) => setItems(items.map((row, position) => position === index ? { ...row, unitPrice: Number(event.target.value) } : row))} /></div>
            <strong className="item-total">{money(Math.round(item.quantity * item.unitPrice * 100), currency)}</strong>
            <button type="button" className="icon-button" disabled={items.length <= 1} onClick={() => setItems(items.filter((_, position) => position !== index))}><Trash2 size={15} /></button>
          </div>)}
        </div>
        <button type="button" className="add-item-button" onClick={() => setItems([...items, { description: "", quantity: 1, unitPrice: 0 }])}><Plus size={15} />Agregar concepto</button>
        <div className="form-grid" style={{ marginTop: 16 }}>
          <label className="form-field">Estado<select value={status} onChange={(event) => setStatus(event.target.value as SaleStatus)}><option value="paid">Pagada</option><option value="pending">Por cobrar</option><option value="cancelled">Cancelada</option></select></label>
          <label className="form-field">IVA %<input type="number" min={0} max={100} step="0.01" value={rate} onChange={(event) => setRate(Number(event.target.value))} /></label>
          <label className="form-field">Descuento %<input type="number" min={0} max={100} step="0.01" value={discountPercent} onChange={(event) => setDiscountPercent(Number(event.target.value))} /></label>
          <label className="form-field full-width">Notas<textarea rows={2} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>
        <div className="editor-totals" style={{ marginTop: 12 }}><div><span>Subtotal</span><strong>{money(totals.subtotalCents, currency)}</strong></div>{totals.discountCents > 0 && <div><span>Descuento ({discountPercent}%)</span><strong>-{money(totals.discountCents, currency)}</strong></div>}<div><span>IVA</span><strong>{money(totals.taxCents, currency)}</strong></div><div className="editor-grand-total"><span>Total</span><strong>{money(totals.totalCents, currency)}</strong></div></div>
        {error && <div className="form-error" role="alert">{error}</div>}
      </div>
      <footer className="modal-footer"><button type="button" className="button button-secondary" disabled={saving} onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}Guardar venta</button></footer>
    </form>
  </Modal>;
}

export function downloadSalesCsv(sales: Sale[]) {
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [["Folio", "Fecha", "Cliente", "Conceptos", "Pago", "Estado", "Total"], ...sales.map((sale) => [sale.number, sale.soldAt, sale.customerName, sale.items.map((item) => `${item.quantity} x ${item.description}`).join(" | "), payLabel[sale.paymentMethod], statusLabel[sale.status], (sale.totalCents / 100).toFixed(2)])];
  const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(escape).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ventas-${dateInput()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function rankProducts(sales: Sale[]) {
  const map = new Map<string, { name: string; qty: number; total: number }>();
  for (const sale of sales) {
    if (sale.status === "cancelled") continue;
    for (const item of sale.items) {
      const name = item.description.trim() || "Sin nombre";
      const current = map.get(name) || { name, qty: 0, total: 0 };
      current.qty += item.quantity;
      current.total += Math.round(item.quantity * item.unitPrice * 100);
      map.set(name, current);
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function lastMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - count + index + 1, 1);
    return { key: dateInput(date).slice(0, 7), label: date.toLocaleDateString("es-MX", { month: "short" }).replace(".", "") };
  });
}

function previousMonth(prefix: string) {
  const [year, month] = prefix.split("-").map(Number);
  const date = new Date(year, (month || 1) - 2, 1);
  return dateInput(date).slice(0, 7);
}
