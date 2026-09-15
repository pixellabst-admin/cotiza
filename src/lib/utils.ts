import type { Quote, QuoteItem, QuoteStatus, Period } from "./types";

export const statusMeta: Record<QuoteStatus, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "#a6adb4" },
  sent: { label: "Enviada", color: "#83b9e5" },
  accepted: { label: "Aceptada", color: "#25a683" },
  expired: { label: "Vencida", color: "#edb678" },
};

export function money(cents: number, currency = "MXN", decimals = true) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, currencyDisplay: "narrowSymbol", minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 }).format(cents / 100);
}
export function dateInput(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
export function formatDate(value: string, withYear = false) {
  return new Date(value.slice(0, 10) + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", ...(withYear ? { year: "numeric" as const } : {}) }).replace(/\./g, "");
}
export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
export function calculateTotals(items: QuoteItem[], taxRate: number, discountPercent: number) {
  const subtotalCents = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPrice * 100), 0);
  const discountCents = Math.round(subtotalCents * discountPercent / 100);
  const taxCents = Math.round((subtotalCents - discountCents) * taxRate / 100);
  return { subtotalCents, discountCents, taxCents, totalCents: subtotalCents - discountCents + taxCents };
}
export function inPeriod(quotes: Quote[], period: Period, now = new Date()) {
  const reference = period === "previous" ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now;
  const prefix = period === "year" ? String(reference.getFullYear()) : dateInput(reference).slice(0, 7);
  return quotes.filter((quote) => quote.issueDate.startsWith(prefix));
}
export function chartData(quotes: Quote[], months = 6) {
  const now = new Date();
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - months + index + 1, 1);
    const prefix = dateInput(date).slice(0, 7);
    const monthQuotes = quotes.filter((quote) => quote.issueDate.startsWith(prefix));
    return {
      key: prefix,
      label: date.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""),
      fullLabel: date.toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
      total: monthQuotes.reduce((sum, quote) => sum + quote.totalCents, 0),
      accepted: monthQuotes.filter((quote) => quote.status === "accepted").reduce((sum, quote) => sum + quote.totalCents, 0),
    };
  });
}
export function effectiveStatus(quote: Quote): QuoteStatus {
  return quote.status !== "accepted" && quote.status !== "draft" && quote.validUntil < dateInput() ? "expired" : quote.status;
}
