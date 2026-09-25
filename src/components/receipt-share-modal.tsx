"use client";

import { useState } from "react";
import { Mail, Copy, Check, ExternalLink, Download } from "lucide-react";
import type { Business, Customer, Sale } from "@/lib/types";
import { money } from "@/lib/utils";
import { Modal, WhatsAppIcon } from "./ui";
import { downloadPaymentReceipt } from "@/lib/export";

export function ReceiptShareModal({ sale, customer, business, onClose }: { sale: Sale; customer?: Customer; business: Business; onClose: () => void }) {
  const link = `${typeof window === "undefined" ? "" : window.location.origin}/recibo/${sale.number}`;
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [message, setMessage] = useState(`Hola ${sale.customerName || customer?.name || ""}, gracias por tu compra. Te comparto tu comprobante de pago ${sale.number} por ${money(sale.totalCents, business.currency)}. El PDF se descarga desde tu panel; también puedes verlo aquí:\n${link}`);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function download() {
    await downloadPaymentReceipt(sale, customer, business);
  }

  async function open() {
    setError("");
    if (channel === "whatsapp") {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) { setError("Escribe el WhatsApp con código de país."); return; }
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Escribe un correo válido."); return; }
      window.open(`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Comprobante de pago ${sale.number}`)}&body=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    }
  }

  return <Modal title={`Enviar comprobante ${sale.number}`} subtitle="El enlace abre el comprobante. Descarga el PDF y adjúntalo cuando lo pida la app." onClose={onClose}>
    <div className="modal-body">
      <div className="send-channels">
        <button className={`send-channel whatsapp ${channel === "whatsapp" ? "active" : ""}`} onClick={() => setChannel("whatsapp")}><WhatsAppIcon size={22} /><span>WhatsApp</span></button>
        <button className={`send-channel email ${channel === "email" ? "active" : ""}`} onClick={() => setChannel("email")}><Mail size={22} /><span>Correo</span></button>
      </div>
      {channel === "whatsapp"
        ? <label className="form-field">WhatsApp del cliente<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+52 55 1234 5678" /></label>
        : <label className="form-field">Correo del cliente<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@correo.com" /></label>}
      <label className="form-field" style={{ marginTop: 14 }}>Mensaje<textarea rows={6} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      <div className="share-link-box"><Link2Icon />
        <a href={link} target="_blank" rel="noreferrer">{link}</a>
        <button type="button" className="text-button" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2200); }}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copiado" : "Copiar enlace"}</button>
      </div>
      <button type="button" className="button button-secondary" onClick={() => void download()} style={{ marginTop: 12 }}><Download size={15} />Descargar PDF ahora</button>
      <p className="field-help" style={{ marginTop: 10 }}>WhatsApp no permite adjuntar un PDF desde un botón web. Abre el chat, toca el clip y adjunta el PDF descargado. Por correo, pulsa el clip y adjúntalo.</p>
      {error && <div className="form-error">{error}</div>}
    </div>
    <div className="modal-footer"><button className="button button-secondary" onClick={onClose}>Cerrar</button><button className="button button-primary" onClick={() => void open()}><ExternalLink size={15} />Abrir {channel === "whatsapp" ? "WhatsApp" : "correo"}</button></div>
  </Modal>;
}

function Link2Icon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>;
}
