import type { Business, Customer, Quote } from "./types";
import { calculateTotals, formatDate, money, socialLinks, statusMeta } from "./utils";

export function downloadCsv(quotes: Quote[], customers: Customer[]) {
  const escape = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+@-]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows = [
    ["Número", "Título", "Cliente", "Emisión", "Vigencia", "Estado", "Subtotal", "IVA", "Total", "Moneda"],
    ...quotes.map((quote) => [quote.number, quote.title, customers.find((customer) => customer.id === quote.customerId)?.name ?? "", quote.issueDate, quote.validUntil, statusMeta[quote.status].label, (quote.subtotalCents / 100).toFixed(2), (quote.taxCents / 100).toFixed(2), (quote.totalCents / 100).toFixed(2), quote.currency]),
  ];
  const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(escape).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cotizaciones-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadQuotePdf(quote: Quote, customer: Customer, business: Business) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const clean = (text: string) => text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const text = (value: string, x: number, y: number, size = 10, bold = false, color = "#263d34", align: "left" | "right" = "left") => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(color); doc.text(clean(value), x, y, { align });
  };
  doc.setFillColor("#edf7f2"); doc.rect(0, 0, 210, 46, "F");
  let nameX = 20;
  if (business.logoData) {
    try {
      const format = business.logoData.includes("image/jpeg") ? "JPEG" : "PNG";
      const props = doc.getImageProperties(business.logoData);
      const maxW = 36, maxH = 18;
      const scale = Math.min(maxW / props.width, maxH / props.height);
      const width = props.width * scale, height = props.height * scale;
      doc.addImage(business.logoData, format, 20, 12, width, height);
      nameX = 20 + width + 6;
    } catch { /* If the logo cannot be embedded, the business name still prints. */ }
  }
  text(business.name, nameX, 23, 16, true, "#208363");
  text("COTIZACIÓN", 190, 19, 10, true, "#557567", "right");
  text(quote.number, 190, 30, 19, true, "#263d34", "right");
  text(business.email, nameX, 33, 9, false, "#648073");
  const social = socialLinks(business).map((item) => item.label).join("  ·  ");
  if (social) text(social, nameX, 40, 8, false, "#648073");
  text("PREPARADA PARA", 20, 61, 8, true, "#829087");
  text(customer.name, 20, 70, 13, true);
  text(customer.contact, 20, 77, 10, false, "#65766d");
  text(customer.email, 20, 84, 9, false, "#65766d");
  text(`Emisión: ${formatDate(quote.issueDate, true)}`, 190, 62, 9, false, "#65766d", "right");
  text(`Válida hasta: ${formatDate(quote.validUntil, true)}`, 190, 70, 9, false, "#65766d", "right");
  text(`Moneda: ${quote.currency}`, 190, 78, 9, false, "#65766d", "right");
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(clean(quote.title), 170);
  doc.setTextColor("#263d34"); doc.text(titleLines, 20, 101);
  let y = 110 + (titleLines.length - 1) * 7;
  const tableHeader = () => { doc.setFillColor("#f3f6f4"); doc.roundedRect(20, y, 170, 11, 2, 2, "F"); text("CONCEPTO", 24, y + 7, 8, true, "#758179"); text("CANT.", 123, y + 7, 8, true, "#758179", "right"); text("PRECIO", 156, y + 7, 8, true, "#758179", "right"); text("IMPORTE", 186, y + 7, 8, true, "#758179", "right"); y += 16; };
  tableHeader();
  for (const item of quote.items) {
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(clean(item.description), 84);
    const height = Math.max(14, lines.length * 5 + 6);
    if (y + height > 268) { doc.addPage(); y = 24; tableHeader(); }
    doc.setTextColor("#263d34"); doc.text(lines, 24, y + 2);
    text(String(item.quantity), 123, y + 2, 9, false, "#65766d", "right");
    text(money(Math.round(item.unitPrice * 100), quote.currency), 156, y + 2, 9, false, "#65766d", "right");
    text(money(Math.round(item.unitPrice * item.quantity * 100), quote.currency), 186, y + 2, 9, true, "#263d34", "right");
    y += height; doc.setDrawColor("#e8eeea"); doc.line(20, y - 5, 190, y - 5);
  }
  if (y > 210) { doc.addPage(); y = 30; }
  y += 5;
  text("Subtotal", 119, y, 10, false, "#65766d"); text(money(quote.subtotalCents, quote.currency), 186, y, 10, false, "#263d34", "right"); y += 9;
  const { discountCents } = calculateTotals(quote.items, quote.taxRate, quote.discountPercent);
  if (discountCents) { text(`Descuento (${quote.discountPercent}%)`, 119, y, 10, false, "#65766d"); text(`-${money(discountCents, quote.currency)}`, 186, y, 10, false, "#263d34", "right"); y += 9; }
  text(`IVA (${quote.taxRate}%)`, 119, y, 10, false, "#65766d"); text(money(quote.taxCents, quote.currency), 186, y, 10, false, "#263d34", "right"); y += 8;
  doc.setFillColor("#edf7f2"); doc.roundedRect(114, y, 76, 16, 2, 2, "F");
  text("Total", 119, y + 10, 12, true, "#208363"); text(money(quote.totalCents, quote.currency), 186, y + 10, 14, true, "#208363", "right"); y += 33;
  if (quote.notes) {
    if (y > 245) { doc.addPage(); y = 25; }
    text("TÉRMINOS Y CONDICIONES", 20, y, 8, true, "#758179"); y += 8;
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    const lines: string[] = doc.splitTextToSize(clean(quote.notes), 170);
    for (const line of lines) { if (y > 270) { doc.addPage(); y = 25; } text(line, 20, y, 9, false, "#65766d"); y += 5; }
  }
  const pages = doc.getNumberOfPages();
  for (let index = 1; index <= pages; index++) {
    doc.setPage(index); doc.setDrawColor("#e8eeea"); doc.line(20, 280, 190, 280);
    const footerSocial = socialLinks(business).map((item) => item.href.replace(/^https?:\/\//, "")).join("  ·  ");
    text(footerSocial ? footerSocial.slice(0, 70) : "Gracias por confiar en nuestro trabajo.", 20, 286, 7.5, false, "#829087");
    text(`Hecho con cotiza.  |  ${index} / ${pages}`, 190, 286, 8, false, "#829087", "right");
  }
  doc.save(`${quote.number}.pdf`);
}
