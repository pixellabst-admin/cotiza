"use client";

import { useState } from "react";
import { Mail, Copy, Check, ExternalLink, ImagePlus, Heart, Info, LoaderCircle, X } from "lucide-react";
import type { Business, Customer, Quote, ShareChannel } from "@/lib/types";
import { money } from "@/lib/utils";
import { Modal, WhatsAppIcon } from "./ui";

async function compressPhoto(file: File) {
  if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) throw new Error("Usa una foto PNG o JPG.");
  if (file.size > 4_000_000) throw new Error("La foto pesa más de 4 MB.");
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const max = 900;
      const scale = Math.min(1, max / Math.max(image.width, image.height, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(url); reject(new Error("No pudimos leer la foto")); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const data = canvas.toDataURL("image/jpeg", 0.82);
      if (data.length > 900000) reject(new Error("La foto sigue siendo muy grande. Prueba con otra más ligera."));
      else resolve(data);
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No pudimos leer la foto")); };
    image.src = url;
  });
}

export function ThankYouModal({ quote, customer, business, onClose, onSave }: {
  quote: Quote; customer: Customer; business: Business;
  onClose: () => void;
  onSave: (input: { message: string; photo: string }) => Promise<Quote>;
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const [channel, setChannel] = useState<ShareChannel>("whatsapp");
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email);
  const [message, setMessage] = useState(quote.thankYouMessage || `Hola ${customer.contact || customer.name},\n\nGracias por tu compra. Fue un gusto preparar ${quote.title.toLocaleLowerCase("es")} para ti.\n\nFolio ${quote.number} · ${money(quote.totalCents, quote.currency)}\n\nAquí te dejamos una tarjeta con el detalle y, si la agregamos, una foto del producto:\n${origin}/gracias/${quote.thankYouToken}\n\n¡Esperamos verte pronto!\n${business.name}`);
  const [photo, setPhoto] = useState(quote.thankYouPhoto || "");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadPhoto(file?: File | null) {
    if (!file) return;
    try { setPhoto(await compressPhoto(file)); setError(""); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "No pudimos leer la foto"); }
  }

  async function send() {
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (channel === "whatsapp" && (digits.length < 8 || digits.length > 15)) { setError("Escribe el WhatsApp con código de país."); return; }
    if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Escribe un correo válido."); return; }
    setSaving(true);
    try {
      const saved = await onSave({ message, photo });
      const link = `${origin}/gracias/${saved.thankYouToken}`;
      const finalMessage = message.includes(quote.thankYouToken) ? message.split(quote.thankYouToken).join(saved.thankYouToken) : `${message.trim()}\n\n${link}`;
      if (channel === "whatsapp") window.open(`https://wa.me/${digits}?text=${encodeURIComponent(finalMessage)}`, "_blank", "noopener,noreferrer");
      else window.open(`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Gracias por tu compra · ${quote.number}`)}&body=${encodeURIComponent(finalMessage)}`, "_blank", "noopener,noreferrer");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "No pudimos guardar el agradecimiento");
    } finally { setSaving(false); }
  }

  return <Modal title="Agradecer la compra" subtitle={`${quote.number} · ${customer.name}`} onClose={() => { if (!saving) onClose(); }} className="share-modal">
    <div className="modal-body">
      <div className="send-channels">
        <button className={`send-channel whatsapp ${channel === "whatsapp" ? "active" : ""}`} onClick={() => setChannel("whatsapp")}><WhatsAppIcon size={22} /><span>WhatsApp</span></button>
        <button className={`send-channel email ${channel === "email" ? "active" : ""}`} onClick={() => setChannel("email")}><Mail size={20} /><span>Correo</span></button>
      </div>
      {channel === "whatsapp" ? <label className="form-field">WhatsApp del cliente<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+52 55 1234 5678" /></label> : <label className="form-field">Correo del cliente<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
      <label className="form-field">Mensaje personalizado<textarea rows={8} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      <label className="form-field">Foto del producto <span className="field-help">(opcional)</span>
        <span className="logo-upload">
          {photo ? <img src={photo} alt="Producto" className="logo-preview" /> : <span className="logo-placeholder"><ImagePlus size={22} /></span>}
          <span className="logo-upload-actions">
            <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Subir foto del producto" onChange={(event) => { void loadPhoto(event.target.files?.[0]); event.target.value = ""; }} />
            {photo && <button type="button" className="text-button" onClick={() => setPhoto("")}><X size={13} />Quitar foto</button>}
          </span>
        </span>
      </label>
      <div className="share-info"><Info size={15} /><p>WhatsApp y el correo no permiten adjuntar la foto desde aquí. La foto viaja en una <strong>tarjeta de agradecimiento</strong> que el cliente abre con el enlace del mensaje.</p></div>
      {error && <div className="form-error" role="alert">{error}</div>}
    </div>
    <footer className="modal-footer">
      <button className="button button-secondary" onClick={async () => { try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError("Copia el mensaje manualmente."); } }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copiado" : "Copiar texto"}</button>
      <button className="button button-primary" onClick={() => void send()} disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : <Heart size={16} />}Guardar y enviar<ExternalLink size={14} /></button>
    </footer>
  </Modal>;
}
