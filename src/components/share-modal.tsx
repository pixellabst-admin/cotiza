"use client";

import { useState } from "react";
import { Mail, Copy, Check, ExternalLink, Link2, Info, LoaderCircle } from "lucide-react";
import type { Business, Customer, Quote, ShareChannel } from "@/lib/types";
import { formatDate, money } from "@/lib/utils";
import { Modal, WhatsAppIcon } from "./ui";

export function ShareModal({ quote, customer, business, initialChannel = "whatsapp", onClose, onRecordShare, onMarkSent }: { quote: Quote; customer: Customer; business: Business; initialChannel?: ShareChannel; onClose: () => void; onRecordShare: (channel: ShareChannel) => Promise<void>; onMarkSent: () => Promise<void> }) {
  const link = `${typeof window === "undefined" ? "" : window.location.origin}/cotizacion/${quote.shareToken}`;
  const [channel, setChannel] = useState<ShareChannel>(initialChannel);
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email);
  const [subject, setSubject] = useState(`Cotización ${quote.number} · ${quote.title}`);
  const [message, setMessage] = useState(`Hola ${customer.contact || customer.name},\n\nTe comparto nuestra cotización para ${quote.title.toLocaleLowerCase("es")}.\n\nCotización: ${quote.number}\nTotal: ${money(quote.totalCents, quote.currency)} ${quote.currency}\nVálida hasta: ${formatDate(quote.validUntil, true)}\n\nPuedes consultar todos los detalles, descargar el PDF y aceptar la propuesta aquí:\n${link}\n\n¡Nos encantará trabajar contigo!\n${business.name}\n${business.email}`);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [opened, setOpened] = useState(false);
  const [saving, setSaving] = useState(false);
  async function copy(value: string, kind: string) {
    try { await navigator.clipboard.writeText(value); setCopied(kind); setTimeout(() => setCopied(""), 2500); }
    catch { setError("No pudimos copiar automáticamente. Selecciona y copia el texto del mensaje."); }
  }
  async function openApp() {
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (channel === "whatsapp" && (digits.length < 8 || digits.length > 15)) { setError("Escribe el número de WhatsApp con su código de país."); return; }
    if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Escribe un correo electrónico válido."); return; }
    if (!message.trim()) { setError("Escribe un mensaje para tu cliente."); return; }
    if (channel === "whatsapp") window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    else window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    setOpened(true);
    try { await onRecordShare(channel); } catch { setError("Tu aplicación se abrió, pero no pudimos registrar el canal. Puedes intentarlo de nuevo."); }
  }
  async function markSent() {
    setSaving(true); setError("");
    try { await onMarkSent(); } catch (error) { setError(error instanceof Error ? error.message : "No pudimos actualizar el estado"); } finally { setSaving(false); }
  }
  return <Modal title="Tu propuesta, un paso más cerca" subtitle={`${quote.number} · ${customer.name}`} onClose={() => { if (!saving) onClose(); }} className="share-modal"><div className="modal-body"><div className="send-channels"><button className={`send-channel whatsapp ${channel === "whatsapp" ? "active" : ""}`} onClick={() => { setChannel("whatsapp"); setError(""); }}><WhatsAppIcon size={23} /><span>WhatsApp</span>{channel === "whatsapp" && <Check size={15} />}</button><button className={`send-channel email ${channel === "email" ? "active" : ""}`} onClick={() => { setChannel("email"); setError(""); }}><Mail size={22} /><span>Correo electrónico</span>{channel === "email" && <Check size={15} />}</button></div>{channel === "whatsapp" ? <label className="form-field">Número de WhatsApp<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+52 55 1234 5678" /><span className="field-help">Incluye el código de país, por ejemplo +52 para México.</span></label> : <div className="share-email-fields"><label className="form-field">Correo del destinatario<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@empresa.com" /></label><label className="form-field">Asunto<input value={subject} maxLength={300} onChange={(event) => setSubject(event.target.value)} /></label></div>}<label className="form-field share-message"><span className="field-label-row"><span>Un mensaje con tu toque personal</span><button className="text-button" type="button" onClick={() => copy(message, "message")}>{copied === "message" ? <Check size={13} /> : <Copy size={13} />}{copied === "message" ? "Copiado" : "Copiar"}</button></span><textarea rows={9} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={10000} /></label><div className="share-link-box"><span><Link2 size={17} /><span>Enlace de tu cotización<small>Tu cliente puede verla sin crear una cuenta.</small></span></span><button className="button button-secondary button-sm" onClick={() => copy(link, "link")}>{copied === "link" ? <Check size={14} /> : <Copy size={14} />}{copied === "link" ? "Copiado" : "Copiar enlace"}</button></div><div className="share-info"><Info size={15} /><p>Se abrirá {channel === "whatsapp" ? "WhatsApp" : "tu aplicación de correo"} con el mensaje listo. <strong>Confirma el envío allí.</strong> La cotización completa y su PDF están disponibles en el enlace.</p></div>{error && <div className="form-error" role="alert">{error}</div>}{opened && quote.status === "draft" && <div className="share-confirm"><span>¿Ya enviaste el mensaje a tu cliente?</span><button className="text-button" onClick={markSent} disabled={saving}>{saving ? <LoaderCircle size={14} className="spin" /> : <Check size={14} />}Sí, marcar como enviada</button></div>}</div><footer className="modal-footer"><button className="button button-secondary" onClick={onClose} disabled={saving}>{opened ? "Listo" : "Volver"}</button><button className="button button-primary" onClick={openApp} disabled={saving}>{channel === "whatsapp" ? <WhatsAppIcon size={18} /> : <Mail size={17} />}Abrir {channel === "whatsapp" ? "WhatsApp" : "correo"}<ExternalLink size={14} /></button></footer></Modal>;
}
