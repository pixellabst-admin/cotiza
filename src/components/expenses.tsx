"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2, Pencil, ReceiptText, ShoppingCart, Wallet, CircleDot, TrendingDown, FileSpreadsheet, Check, LoaderCircle, X, FileDown } from "lucide-react";
import type { AppData, Expense, PaymentMethod } from "@/lib/types";
import { dateInput, formatDate, money } from "@/lib/utils";
import { EmptyState, Modal } from "./ui";

const payLabel: Record<PaymentMethod, string> = { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", other: "Otro" };
const statusLabel = { paid: "Pagada", pending: "Por pagar", cancelled: "Cancelada" } as const;
const kindLabel = { purchase: "Compra", expense: "Gasto" } as const;
export const expenseCategories = ["Materia prima / inventario", "Empaque", "Herramientas", "Marketing", "Renta", "Servicios", "Transporte", "Sueldos", "Equipo", "Impuestos", "General"];

export function ExpensesDesk({ data, periodPrefix, onSave, onDelete, onExportCsv, onExportPdf, onExportExcel }: {
  data: AppData;
  periodPrefix: string;
  onSave: (input: Omit<Expense, "id" | "number" | "createdAt" | "amountCents"> & { id?: number; amount: number }) => Promise<void>;
  onDelete: (expense: Expense) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
}) {
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [kindFilter, setKindFilter] = useState<"all" | "purchase" | "expense">("all");
  const currency = data.settings.currency;
  const period = data.expenses.filter((expense) => expense.spentAt.startsWith(periodPrefix));
  const active = period.filter((expense) => expense.status !== "cancelled");
  const paid = active.filter((expense) => expense.status === "paid");
  const pending = active.filter((expense) => expense.status === "pending");
  const total = paid.reduce((sum, expense) => sum + expense.amountCents, 0);
  const pendingCents = pending.reduce((sum, expense) => sum + expense.amountCents, 0);
  const purchases = paid.filter((expense) => expense.kind === "purchase").reduce((sum, expense) => sum + expense.amountCents, 0);
  const otherExpenses = paid.filter((expense) => expense.kind === "expense").reduce((sum, expense) => sum + expense.amountCents, 0);
  const income = data.sales.filter((sale) => sale.soldAt.startsWith(periodPrefix) && sale.status === "paid").reduce((sum, sale) => sum + sale.totalCents, 0);
  const profit = income - total;
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of paid) map.set(expense.category, (map.get(expense.category) || 0) + expense.amountCents);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [paid]);
  const months = lastMonths(6);
  const monthTotals = months.map((month) => ({ ...month, total: data.expenses.filter((expense) => expense.spentAt.startsWith(month.key) && expense.status === "paid").reduce((sum, expense) => sum + expense.amountCents, 0) }));
  const maxMonth = Math.max(...monthTotals.map((item) => item.total), 1);
  const visible = [...active].filter((expense) => kindFilter === "all" || expense.kind === kindFilter).sort((a, b) => b.spentAt.localeCompare(a.spentAt));

  return <div className="sales-desk">
    <div className="stats-grid">
      <section className="card stat-card"><div className="stat-heading"><span>Gastos del período</span><span className="stat-icon amber-icon"><Wallet size={19} /></span></div><div className="stat-value"><strong>{money(total, currency, false)}</strong></div><div className="stat-footer"><span className="trend-pill negative"><TrendingDown size={12} />{paid.length} pagos</span></div></section>
      <section className="card stat-card"><div className="stat-heading"><span>Compras</span><span className="stat-icon"><ShoppingCart size={19} /></span></div><div className="stat-value"><strong>{money(purchases, currency, false)}</strong></div><div className="stat-footer"><span>inventario y compras</span></div></section>
      <section className="card stat-card"><div className="stat-heading"><span>Gastos operativos</span><span className="stat-icon"><ReceiptText size={19} /></span></div><div className="stat-value"><strong>{money(otherExpenses, currency, false)}</strong></div><div className="stat-footer"><span>servicios y operación</span></div></section>
      <section className="card stat-card"><div className="stat-heading"><span>Utilidad del período</span><span className={`stat-icon ${profit >= 0 ? "mint-icon" : "amber-icon"}`}><CircleDot size={19} /></span></div><div className="stat-value"><strong>{money(profit, currency, false)}</strong></div><div className="stat-footer"><span>ingresos {money(income, currency, false)} · pendiente {money(pendingCents, currency, false)}</span></div></section>
    </div>

    <div className="charts-grid">
      <section className="card activity-card sales-bars"><div className="card-heading"><div><h2>Gastos por mes</h2><p>Últimos seis meses.</p></div></div><div className="sales-bar-row">{monthTotals.map((month) => <div key={month.key} className="sales-bar"><span className="sales-bar-fill expense-fill" style={{ height: `${Math.max(8, month.total / maxMonth * 100)}%` }} /><strong>{money(month.total, currency, false)}</strong><small>{month.label}</small></div>)}</div></section>
      <section className="card status-card"><div className="card-heading"><div><h2>Gasto por categoría</h2><p>A dónde se fue el dinero.</p></div></div>{byCategory.length ? <ol className="sales-rank">{byCategory.slice(0, 5).map(([category, amount], index) => <li key={category}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{category}</strong><small>{money(amount, currency)}</small></div></li>)}</ol> : <p className="sales-empty-note">Registra tu primer gasto para ver el desglose.</p>}</section>
    </div>

    <section className="card quotes-card">
      <div className="quotes-card-heading"><div className="heading-with-count"><h2>Compras y gastos</h2><span className="count-pill">{data.expenses.length}</span></div><div className="heading-actions">
        <button className="button button-secondary button-sm" onClick={onExportCsv}><FileSpreadsheet size={15} />CSV</button>
        <button className="button button-secondary button-sm" onClick={onExportExcel}><FileSpreadsheet size={15} />Excel</button>
        <button className="button button-secondary button-sm" onClick={onExportPdf}><FileDown size={15} />PDF</button>
        <button className="button button-primary button-sm" onClick={() => setEditing("new")}><Plus size={15} />Registrar</button>
      </div></div>
      <div className="table-toolbar"><div className="table-tabs"><button className={kindFilter === "all" ? "active" : ""} onClick={() => setKindFilter("all")}>Todo</button><button className={kindFilter === "purchase" ? "active" : ""} onClick={() => setKindFilter("purchase")}>Compras</button><button className={kindFilter === "expense" ? "active" : ""} onClick={() => setKindFilter("expense")}>Gastos</button></div></div>
      <div className="table-scroll"><table className="quotes-table"><thead><tr><th>Folio</th><th>Descripción</th><th>Categoría</th><th>Fecha</th><th>Pago</th><th>Estado</th><th className="amount-cell">Monto</th><th aria-label="Acciones" /></tr></thead><tbody>{visible.map((expense) => <tr key={expense.id}><td><strong>{expense.number}</strong><div className="quote-title-cell"><span>{kindLabel[expense.kind]}{expense.supplier ? ` · ${expense.supplier}` : ""}</span></div></td><td>{expense.description}</td><td>{expense.category}</td><td className="date-cell">{formatDate(expense.spentAt, true)}</td><td>{payLabel[expense.paymentMethod]}</td><td><span className={`status-badge status-${expense.status === "paid" ? "accepted" : expense.status === "pending" ? "sent" : "draft"}`}><i />{statusLabel[expense.status]}</span></td><td className="amount-cell"><strong>{money(expense.amountCents, currency)}</strong></td><td><div className="row-actions"><button className="icon-button" aria-label={`Editar ${expense.number}`} onClick={() => setEditing(expense)}><Pencil size={15} /></button><button className="icon-button danger-hover" aria-label={`Eliminar ${expense.number}`} onClick={() => onDelete(expense)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>
      {!visible.length && <EmptyState title="Aún no hay movimientos" description="Registra compras de inventario, renta, servicios, materiales y todo lo que sale de caja." onAction={() => setEditing("new")} action="Registrar gasto" />}
    </section>

    {editing && <ExpenseForm expense={editing === "new" ? undefined : editing} currency={currency} onClose={() => setEditing(null)} onSave={async (input) => { await onSave(input); setEditing(null); }} />}
  </div>;
}

function ExpenseForm({ expense, currency, onClose, onSave }: { expense?: Expense; currency: string; onClose: () => void; onSave: (input: Omit<Expense, "id" | "number" | "createdAt" | "amountCents"> & { id?: number; amount: number }) => Promise<void> }) {
  const [input, setInput] = useState({
    description: expense?.description ?? "",
    category: expense?.category ?? "General",
    supplier: expense?.supplier ?? "",
    spentAt: expense?.spentAt ?? dateInput(),
    amount: expense ? expense.amountCents / 100 : 0,
    paymentMethod: (expense?.paymentMethod ?? "transfer") as PaymentMethod,
    status: (expense?.status ?? "paid") as "paid" | "pending" | "cancelled",
    kind: (expense?.kind ?? "expense") as "purchase" | "expense",
    notes: expense?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.description.trim()) { setError("Escribe una descripción."); return; }
    if (!(input.amount > 0)) { setError("El monto debe ser mayor a cero."); return; }
    setSaving(true); setError("");
    try { await onSave({ ...expense, ...input }); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "No pudimos guardar el gasto"); setSaving(false); }
  }
  return <Modal title={expense ? `Editar ${expense.number}` : "Registrar compra o gasto"} subtitle="Controla todo lo que sale de caja." onClose={() => { if (!saving) onClose(); }}>
    <form onSubmit={submit}><div className="modal-body"><div className="form-grid">
      <label className="form-field full-width">Descripción<input required maxLength={240} value={input.description} onChange={(event) => setInput({ ...input, description: event.target.value })} placeholder="Ej. Compra de materiales" /></label>
      <label className="form-field">Tipo<select value={input.kind} onChange={(event) => setInput({ ...input, kind: event.target.value as "purchase" | "expense" })}><option value="purchase">Compra</option><option value="expense">Gasto</option></select></label>
      <label className="form-field">Categoría<select value={input.category} onChange={(event) => setInput({ ...input, category: event.target.value })}>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="form-field">Proveedor (opcional)<input maxLength={180} value={input.supplier} onChange={(event) => setInput({ ...input, supplier: event.target.value })} /></label>
      <label className="form-field">Fecha<input required type="date" value={input.spentAt} onChange={(event) => setInput({ ...input, spentAt: event.target.value })} /></label>
      <label className="form-field">Monto<div className="currency-input"><span>$</span><input required type="number" min="0.01" step="0.01" value={input.amount} onChange={(event) => setInput({ ...input, amount: Number(event.target.value) })} /></div></label>
      <label className="form-field">Forma de pago<select value={input.paymentMethod} onChange={(event) => setInput({ ...input, paymentMethod: event.target.value as PaymentMethod })}><option value="transfer">Transferencia</option><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="other">Otro</option></select></label>
      <label className="form-field">Estado<select value={input.status} onChange={(event) => setInput({ ...input, status: event.target.value as "paid" | "pending" | "cancelled" })}><option value="paid">Pagada</option><option value="pending">Por pagar</option><option value="cancelled">Cancelada</option></select></label>
      <label className="form-field full-width">Notas<textarea rows={2} maxLength={2000} value={input.notes} onChange={(event) => setInput({ ...input, notes: event.target.value })} /></label>
      <p className="field-help full-width">Moneda: {currency}. Las compras y gastos se usan para calcular la utilidad del período.</p>
      {error && <div className="form-error full-width" role="alert">{error}</div>}
    </div></div><div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose} disabled={saving}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}Guardar</button></div></form>
  </Modal>;
}

function lastMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - count + index + 1, 1);
    return { key: dateInput(date).slice(0, 7), label: date.toLocaleDateString("es-MX", { month: "short" }).replace(".", "") };
  });
}
