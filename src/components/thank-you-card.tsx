"use client";

import { Heart, Sparkles } from "lucide-react";
import type { Business, Customer, Quote } from "@/lib/types";
import { money, socialLinks } from "@/lib/utils";
import { Brand } from "./ui";

export function ThankYouCard({ quote, customer, settings }: { quote: Quote; customer: Customer; settings: Business }) {
  return <div className="public-page thank-page">
    <header className="public-header"><a href="/" aria-label="Inicio"><Brand small /></a><span><Heart size={14} />Un detalle de {settings.name}</span></header>
    <main className="public-main thank-main">
      <span className="eyebrow">GRACIAS POR TU COMPRA</span>
      <h1>Hecho con gusto para ti, {customer.contact || customer.name}.</h1>
      {quote.thankYouPhoto && <img src={quote.thankYouPhoto} alt={quote.title} className="thank-photo" />}
      <article className="card thank-note">
        <Sparkles size={18} />
        <p>{quote.thankYouMessage}</p>
      </article>
      <p className="thank-meta">{quote.number} · {quote.title} · {money(quote.totalCents, quote.currency)}</p>
      {socialLinks(settings).length > 0 && <div className="document-social">{socialLinks(settings).map((item) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer">{item.label}</a>)}</div>}
      <footer className="public-footer">{settings.name}{settings.email ? ` · ${settings.email}` : ""}</footer>
    </main>
  </div>;
}
