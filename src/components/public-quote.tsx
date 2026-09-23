"use client";

import { useState, type FormEvent } from "react";
import { Check, CheckCircle2, Download, LockKeyhole, LoaderCircle, ArrowUpRight, XCircle, Clock3, Archive, MessageSquare } from "lucide-react";
import type { Business, Customer, Quote, QuoteStatus } from "@/lib/types";
import { formatDate, money } from "@/lib/utils";
import { downloadQuotePdf } from "@/lib/export";
import { Brand, Modal } from "./ui";
import { QuoteDocument } from "./quote-document";

const copy: Record<QuoteStatus, { title: string; text: (quote: Quote) => string }> = {
  accepted: { title: "La oferta fue aprobada.", text: (quote) => `Quedó registrada a nombre de ${quote.acceptedBy || "el cliente"}.` },
  rejected: { title: "La oferta fue rechazada.", text: () => "El emisor ya puede ver tu decisión." },
  review: { title: "Quedó en revisión.", text: (quote) => `Tienes hasta el ${formatDate(quote.validUntil, true)} para aprobarla o rechazarla.` },
  archived: { title: "Esta oferta quedó archivada.", text: () => "El plazo de 15 días venció sin una decisión. Contacta al emisor si aún te interesa." },
  expired: { title: "Esta oferta quedó archivada.", text: () => "El plazo venció. Contacta al emisor para una nueva vigencia." },
  draft: { title: "Una propuesta en preparación", text: () => "El emisor está finalizando los detalles." },
  sent: { title: "¿Listo para decidir?", text: (quote) => `Puedes aprobar, rechazar, pedir cambios o tomarte 15 días. Vigente hasta el ${formatDate(quote.validUntil, true)}.` },
  changes: { title: "Tus comentarios ya llegaron.", text: () => "El equipo los verá y te enviará una versión corregida." },
};

export function PublicQuote({ quote: initialQuote, customer, settings }: { quote: Quote; customer: Customer; settings: Business }) {
  const [quote, setQuote] = useState(initialQuote);
  const [dialog, setDialog] = useState<"accept" | "reject" | "review" | "changes" | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState("");
  const open = quote.status === "sent" || quote.status === "review" || quote.status === "changes";
  const message = copy[quote.status];

  async function decide(event: FormEvent) {
    event.preventDefault();
    if (!dialog) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/public/${quote.shareToken}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: dialog, name, note }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setQuote({ ...quote, status: result.status || (dialog === "accept" ? "accepted" : dialog === "reject" ? "rejected" : dialog === "changes" ? "changes" : "review"), acceptedBy: name, decisionNote: dialog === "changes" ? `${name}: ${note}` : quote.decisionNote, validUntil: result.validUntil || quote.validUntil });
      setDialog(null);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "No pudimos registrar tu decisión");
    } finally { setBusy(false); }
  }

  async function pdf() {
    setPdfBusy(true); setError("");
    try { await downloadQuotePdf(quote, customer, settings); }
    catch { setError("No pudimos generar el PDF. Inténtalo de nuevo."); }
    finally { setPdfBusy(false); }
  }

  return <div className="public-page">
    <header className="public-header"><a href="/" aria-label="Inicio de Cotiza"><Brand small /></a><span><LockKeyhole size={14} />Documento compartido de forma segura</span></header>
    <main className="public-main">
      <div className="public-intro"><div><span className="eyebrow">UNA NUEVA OPORTUNIDAD PARA CREAR</span><h1>Hagamos algo increíble.</h1><p>{settings.name} preparó esta propuesta especialmente para ti.</p></div><button className="button button-secondary" onClick={pdf} disabled={pdfBusy}>{pdfBusy ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />}Descargar PDF</button></div>
      {error && !dialog && <div className="form-error" role="alert">{error}</div>}
      <QuoteDocument quote={quote} customer={customer} business={settings} />
      <div className={`public-accept-bar ${quote.status === "accepted" ? "is-accepted" : ""} ${quote.status === "rejected" || quote.status === "archived" ? "is-closed" : ""}`}>
        <div>{quote.status === "rejected" || quote.status === "archived" ? <Archive size={25} /> : quote.status === "review" ? <Clock3 size={25} /> : <CheckCircle2 size={25} />}<div><h3>{message.title}</h3><p>{message.text(quote)}</p></div></div>
        {open && <div className="public-actions">
          <button className="button button-primary" onClick={() => { setDialog("accept"); setError(""); }}>Aprobar oferta<ArrowUpRight size={17} /></button>
          <button className="button button-secondary" onClick={() => { setDialog("changes"); setNote(""); setError(""); }}><MessageSquare size={16} />Pedir cambios</button>
          <button className="button button-secondary" onClick={() => { setDialog("review"); setError(""); }}><Clock3 size={16} />Revisar 15 días</button>
          <button className="button button-secondary" onClick={() => { setDialog("reject"); setError(""); }}><XCircle size={16} />Rechazar</button>
        </div>}
        {(quote.status === "archived" || quote.status === "expired") && <a className="button button-secondary" href={`mailto:${settings.email}?subject=${encodeURIComponent(`Actualizar cotización ${quote.number}`)}`}>Contactar al emisor</a>}
      </div>
      <footer className="public-footer">Menos papeleo. Más posibilidades.<Brand small /></footer>
    </main>
    {dialog && <Modal title={dialog === "accept" ? "Aprobar esta oferta" : dialog === "reject" ? "Rechazar esta oferta" : dialog === "changes" ? "Pedir cambios" : "Dejarla en revisión 15 días"} subtitle={dialog === "changes" ? "Cuéntanos qué te gustaría ajustar. El equipo lo verá y te enviará una nueva versión." : dialog === "review" ? "Pasado ese plazo, si no hay una decisión, la oferta se archiva." : "Confirma con tu nombre."} onClose={() => { if (!busy) setDialog(null); }}>
      <form onSubmit={decide}>
        <div className="modal-body">
          <div className="accept-summary"><span>{quote.number} · {quote.title}</span><strong>{money(quote.totalCents, quote.currency)} {quote.currency}</strong></div>
          <label className="form-field">Tu nombre completo<input required minLength={2} maxLength={180} value={name} onChange={(event) => setName(event.target.value)} placeholder="Escribe tu nombre" /></label>
          {dialog !== "accept" && <label className="form-field">{dialog === "changes" ? "¿Qué te gustaría cambiar?" : "Una nota para el emisor (opcional)"}<textarea rows={dialog === "changes" ? 5 : 3} required={dialog === "changes"} minLength={dialog === "changes" ? 8 : undefined} maxLength={1500} value={note} onChange={(event) => setNote(event.target.value)} placeholder={dialog === "reject" ? "¿Hay algo que debamos mejorar?" : dialog === "changes" ? "Ej. Me gustaría otro color, otra medida o quitar un concepto." : "¿Qué te gustaría revisar?"} /></label>}
          <label className="checkbox-label"><input type="checkbox" required />{dialog === "accept" ? "Acepto los conceptos, importes y condiciones de esta cotización." : dialog === "reject" ? "Confirmo que rechazo esta oferta." : dialog === "changes" ? "Quiero que el equipo reciba estos comentarios y me envíe una versión corregida." : "Pido 15 días para revisarla. Si no decido en ese plazo, podrá archivarse."}</label>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" onClick={() => setDialog(null)} disabled={busy}>Volver</button>
          <button className={`button ${dialog === "reject" ? "button-danger" : "button-primary"}`} disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{dialog === "accept" ? "Confirmar aprobación" : dialog === "reject" ? "Confirmar rechazo" : dialog === "changes" ? "Enviar comentarios" : "Confirmar revisión"}</button>
        </div>
      </form>
    </Modal>}
  </div>;
}
