"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X, FileText, Plus } from "lucide-react";
import { initials, statusMeta } from "@/lib/utils";
import type { QuoteStatus } from "@/lib/types";

export function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? "brand-small" : ""}`}><svg viewBox="0 0 36 39" fill="none" aria-hidden="true"><path d="M8 2h17l8 8v22a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z" fill="currentColor"/><path d="M24 2v7a3 3 0 0 0 3 3h6" fill="#a9e2cc"/><path d="M12 18h12M12 24h8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg><span>cotiza<span className="brand-dot">.</span></span></span>;
}

export function WhatsAppIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M20.2 11.8a8.2 8.2 0 0 1-12.1 7.3L3.5 20.5l1.3-4.7A8.2 8.2 0 1 1 20.2 11.8Z"/><path d="m8.3 7.7 1.3-.2 1 2.2-.9 1.1a8.2 8.2 0 0 0 3.5 3.4l1-1 2.2 1-.1 1.3c-.1.8-1 1.2-1.7 1.2-4.3-.5-7.1-3.6-7.5-7.3 0-.8.5-1.6 1.2-1.7Z"/></svg>;
}

export function Avatar({ name, color = "mint", small = false }: { name: string; color?: string; small?: boolean }) {
  return <span className={`avatar avatar-${color} ${small ? "avatar-small" : ""}`}>{initials(name)}</span>;
}

export function StatusBadge({ status }: { status: QuoteStatus }) {
  return <span className={`status-badge status-${status}`}><i />{statusMeta[status].label}</span>;
}

export function Modal({ title, subtitle, children, onClose, wide = false, className = "" }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean; className?: string }) {
  const content = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => content.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus(), 50);
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab" && content.current) {
        const nodes = [...content.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter((node) => node.offsetParent !== null);
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => { clearTimeout(timer); document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previousFocus?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={content} className={`modal ${wide ? "modal-wide" : ""} ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}><header className="modal-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button close-button" onClick={onClose} aria-label="Cerrar ventana"><X size={20} /></button></header>{children}</div></div>;
}

export function EmptyState({ title = "Aquí empieza tu próxima oportunidad", description = "Crea una cotización y da el primer paso hacia un nuevo proyecto.", onAction, action = "Nueva cotización" }: { title?: string; description?: string; onAction?: () => void; action?: string }) {
  return <div className="empty-state"><span className="empty-icon"><FileText size={27} /></span><h3>{title}</h3><p>{description}</p>{onAction && <button className="button button-primary" onClick={onAction}><Plus size={16} />{action}</button>}</div>;
}
