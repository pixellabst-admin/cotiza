import type { Quote, QuoteItem, QuoteStatus, Period } from "./types";

export const statusMeta: Record<QuoteStatus, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "#a6adb4" },
  sent: { label: "Enviada", color: "#83b9e5" },
  review: { label: "En revisión", color: "#8fb56e" },
  changes: { label: "Comentada", color: "#d4a017" },
  accepted: { label: "Aprobada", color: "#25a683" },
  rejected: { label: "Rechazada", color: "#c07a6e" },
  expired: { label: "Vencida", color: "#edb678" },
  archived: { label: "Archivada", color: "#9aa196" },
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
export function socialHref(value: string, kind: "website" | "facebook" | "instagram" | "tiktok") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, "").replace(/^\/+/, "");
  if (kind === "website") return `https://${handle}`;
  if (kind === "facebook") return handle.includes("facebook.com") ? `https://${handle}` : `https://www.facebook.com/${handle}`;
  if (kind === "instagram") return handle.includes("instagram.com") ? `https://${handle}` : `https://www.instagram.com/${handle}`;
  return handle.includes("tiktok.com") ? `https://${handle}` : `https://www.tiktok.com/@${handle}`;
}
export function socialLinks(business: { website?: string; facebook?: string; instagram?: string; tiktok?: string }) {
  return [
    business.website ? { label: "Web", href: socialHref(business.website, "website") } : null,
    business.facebook ? { label: "Facebook", href: socialHref(business.facebook, "facebook") } : null,
    business.instagram ? { label: "Instagram", href: socialHref(business.instagram, "instagram") } : null,
    business.tiktok ? { label: "TikTok", href: socialHref(business.tiktok, "tiktok") } : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item));
}
export function formatQuoteNumber(prefix: string, value: number) {
  const safe = prefix.replace(/[^A-Za-z0-9-]/g, "").slice(0, 12) || "COT";
  return `${safe}-${String(Math.max(1, value)).padStart(4, "0")}`;
}
export function effectiveStatus(quote: Quote): QuoteStatus {
  if (quote.status === "accepted" || quote.status === "rejected" || quote.status === "draft" || quote.status === "archived" || quote.status === "changes") return quote.status;
  if (quote.status === "expired" || quote.validUntil < dateInput()) return "archived";
  return quote.status;
}
