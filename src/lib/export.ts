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
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.text(clean(value), x, y, { align });
  };
  const networks = socialLinks({
    website: business.website || "",
    facebook: business.facebook || "",
    instagram: business.instagram || "",
    tiktok: business.tiktok || "",
  });
  const headerHeight = 42 + (business.phone ? 5 : 0) + Math.max(networks.length, 0) * 6;
  doc.setFillColor(237, 247, 242);
  doc.rect(0, 0, 210, Math.max(48, headerHeight + 10), "F");
  let nameX = 20;
  if (business.logoData) {
    try {
      const format = business.logoData.includes("image/jpeg") ? "JPEG" : "PNG";
      const props = doc.getImageProperties(business.logoData);
      const scale = Math.min(36 / props.width, 18 / props.height);
      const width = props.width * scale;
      const height = props.height * scale;
      doc.addImage(business.logoData, format, 20, 10, width, height);
      nameX = 20 + width + 6;
    } catch { /* continue without logo */ }
  }
  text(business.name, nameX, 18, 16, true, "#208363");
  text("COTIZACIÓN", 190, 16, 10, true, "#557567", "right");
  text(quote.number, 190, 27, 16, true, "#263d34", "right");
  let headerY = 26;
  if (business.email) { text(business.email, nameX, headerY, 9, false, "#3f5c48"); headerY += 5; }
  if (business.phone) { text(business.phone, nameX, headerY, 9, false, "#3f5c48"); headerY += 5; }
  for (const item of networks) {
    const line = `${item.label}: ${item.href.replace(/^https?:\/\//, "")}`;
    text(line, nameX, headerY, 9, false, "#1b6b3f");
    headerY += 5.2;
  }
  let y = Math.max(headerHeight + 14, 58);
  text("PREPARADA PARA", 20, y, 8, true, "#829087");
  text(`Emisión: ${formatDate(quote.issueDate, true)}`, 190, y, 9, false, "#65766d", "right");
  y += 9;
  text(customer.name, 20, y, 13, true);
  text(`Válida hasta: ${formatDate(quote.validUntil, true)}`, 190, y, 9, false, "#65766d", "right");
  y += 7;
  if (customer.contact) { text(customer.contact, 20, y, 10, false, "#65766d"); y += 6; }
  if (customer.email) { text(customer.email, 20, y, 9, false, "#65766d"); y += 6; }
  text(`Moneda: ${quote.currency}`, 190, y - 6, 9, false, "#65766d", "right");
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(clean(quote.title), 170);
  doc.setTextColor("#263d34");
  doc.text(titleLines, 20, y);
  y += 10 + (titleLines.length - 1) * 7;
  const tableHeader = () => {
    doc.setFillColor("#f3f6f4");
    doc.roundedRect(20, y, 170, 11, 2, 2, "F");
    text("CONCEPTO", 24, y + 7, 8, true, "#758179");
    text("CANT.", 123, y + 7, 8, true, "#758179", "right");
    text("PRECIO", 156, y + 7, 8, true, "#758179", "right");
    text("IMPORTE", 186, y + 7, 8, true, "#758179", "right");
    y += 16;
  };
  tableHeader();
  for (const item of quote.items) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const hasPhoto = Boolean(item.photo && item.photo.startsWith("data:image/"));
    const lines = doc.splitTextToSize(clean(item.description), hasPhoto ? 62 : 84);
    const height = Math.max(hasPhoto ? 28 : 14, lines.length * 5 + 6);
    if (y + height > 250) { doc.addPage(); y = 24; tableHeader(); }
    if (hasPhoto) {
      try {
        const format = item.photo!.includes("jpeg") ? "JPEG" : "PNG";
        doc.addImage(item.photo!, format, 24, y - 2, 22, 22);
      } catch { /* skip broken photo */ }
    }
    doc.setTextColor("#263d34");
    doc.text(lines, hasPhoto ? 50 : 24, y + 2);
    text(String(item.quantity), 123, y + 2, 9, false, "#65766d", "right");
    text(money(Math.round(item.unitPrice * 100), quote.currency), 156, y + 2, 9, false, "#65766d", "right");
    text(money(Math.round(item.unitPrice * item.quantity * 100), quote.currency), 186, y + 2, 9, true, "#263d34", "right");
    y += height;
    doc.setDrawColor("#e8eeea");
    doc.line(20, y - 5, 190, y - 5);
  }
  if (y > 200) { doc.addPage(); y = 30; }
  y += 5;
  text("Subtotal", 119, y, 10, false, "#65766d"); text(money(quote.subtotalCents, quote.currency), 186, y, 10, false, "#263d34", "right"); y += 9;
  const { discountCents } = calculateTotals(quote.items, quote.taxRate, quote.discountPercent);
  if (discountCents) { text(`Descuento (${quote.discountPercent}%)`, 119, y, 10, false, "#65766d"); text(`-${money(discountCents, quote.currency)}`, 186, y, 10, false, "#263d34", "right"); y += 9; }
  text(`IVA (${quote.taxRate}%)`, 119, y, 10, false, "#65766d"); text(money(quote.taxCents, quote.currency), 186, y, 10, false, "#263d34", "right"); y += 8;
  doc.setFillColor("#edf7f2");
  doc.roundedRect(114, y, 76, 16, 2, 2, "F");
  text("Total", 119, y + 10, 12, true, "#208363");
  text(money(quote.totalCents, quote.currency), 186, y + 10, 14, true, "#208363", "right");
  y += 28;
  if (quote.notes) {
    if (y > 230) { doc.addPage(); y = 25; }
    text("TÉRMINOS Y CONDICIONES", 20, y, 8, true, "#758179"); y += 8;
    const lines: string[] = doc.splitTextToSize(clean(quote.notes), 170);
    for (const line of lines) { if (y > 255) { doc.addPage(); y = 25; } text(line, 20, y, 9, false, "#65766d"); y += 5; }
  }
  const pagesBeforeContact = doc.getNumberOfPages();
  doc.addPage();
  doc.setFillColor(237, 247, 242);
  doc.rect(0, 0, 210, 40, "F");
  text("CONTACTO Y REDES SOCIALES", 20, 24, 18, true, "#1f5c32");
  const contactRows: [string, string][] = [
    ["Correo", business.email || ""],
    ["Telefono", business.phone || ""],
    ["Web", business.website || ""],
    ["Facebook", business.facebook || ""],
    ["Instagram", business.instagram || ""],
    ["TikTok", business.tiktok || ""],
  ];
  const filled = contactRows.filter(([, value]) => value.trim());
  let cy = 55;
  if (!["Web", "Facebook", "Instagram", "TikTok"].some((label) => contactRows.find((row) => row[0] === label)?.[1].trim())) {
    text("No hay pagina web ni redes guardadas.", 20, cy, 12, true, "#8a3a2a");
    cy += 10;
    text("Ve a Configuracion, escribe Web / Facebook / Instagram / TikTok", 20, cy, 11, false, "#5c4036");
    cy += 7;
    text("y pulsa Guardar cambios. Luego vuelve a descargar este PDF.", 20, cy, 11, false, "#5c4036");
  } else {
    for (const [label, value] of filled) {
      text(label.toUpperCase(), 20, cy, 8, true, "#5d7a55");
      cy += 6;
      const display = ["Web", "Facebook", "Instagram", "TikTok"].includes(label)
        ? socialLinks({ website: label === "Web" ? value : "", facebook: label === "Facebook" ? value : "", instagram: label === "Instagram" ? value : "", tiktok: label === "TikTok" ? value : "" })[0]?.href.replace(/^https?:\/\//, "") || value
        : value;
      text(display, 20, cy, 12, false, "#1b3d28");
      cy += 12;
    }
  }
  const pages = doc.getNumberOfPages();
  for (let index = 1; index <= pages; index++) {
    doc.setPage(index);
    doc.setDrawColor("#e8eeea");
    doc.line(20, 280, 190, 280);
    text(index === pages && pages > pagesBeforeContact ? "Pagina de contacto y redes" : "Gracias por confiar en nuestro trabajo.", 20, 286, 8, false, "#829087");
    text(`${index} / ${pages}`, 190, 286, 8, false, "#829087", "right");
  }
  doc.save(`${quote.number}.pdf`);
}
