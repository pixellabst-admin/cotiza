"use client";

import { useId, useState } from "react";
import { ChevronDown, Info, TrendingUp } from "lucide-react";
import { chartData, money, statusMeta } from "@/lib/utils";
import type { Quote, QuoteStatus } from "@/lib/types";

type Point = { x: number; y: number };
function curve(points: Point[]) {
  return points.map((point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const half = (point.x - previous.x) / 2;
    return `C ${previous.x + half} ${previous.y}, ${point.x - half} ${point.y}, ${point.x} ${point.y}`;
  }).join(" ");
}

export function ActivityChart({ quotes, currency }: { quotes: Quote[]; currency: string }) {
  const [months, setMonths] = useState(6);
  const [hover, setHover] = useState<number | null>(null);
  const gradient = useId().replace(/:/g, "");
  const data = chartData(quotes, months);
  const highest = Math.max(...data.map((item) => item.total), 100000);
  const step = highest > 10000000 ? 5000000 : highest > 2000000 ? 2000000 : highest > 500000 ? 500000 : 100000;
  const max = Math.ceil(highest / step) * step;
  const points = data.map((item, index) => ({ x: 57 + index * 543 / (months - 1), y: 147 - item.total / max * 124 }));
  const acceptedPoints = data.map((item, index) => ({ x: points[index].x, y: 147 - item.accepted / max * 124 }));
  return <section className="card activity-card"><div className="card-heading"><div><h2>Resumen de cotizaciones</h2><p>Pequeños pasos, grandes resultados.</p></div><label className="select-button chart-period"><select aria-label="Período del gráfico" value={months} onChange={(event) => { setMonths(Number(event.target.value)); setHover(null); }}><option value={6}>Últimos 6 meses</option><option value={3}>Últimos 3 meses</option><option value={12}>Últimos 12 meses</option></select><ChevronDown size={13} /></label></div><div className="chart-container" onMouseLeave={() => setHover(null)}><svg className="activity-svg" viewBox="0 0 620 178" preserveAspectRatio="none" role="img" aria-label={`Importes cotizados y aceptados durante los últimos ${months} meses`}><defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2cac88" stopOpacity=".18" /><stop offset="100%" stopColor="#2cac88" stopOpacity=".01" /></linearGradient></defs>{[0, 1, 2, 3].map((tick) => { const value = max * (3 - tick) / 3; const y = 23 + tick * 124 / 3; return <g key={tick}><line x1="57" x2="609" y1={y} y2={y} stroke="#e9eeeb" strokeDasharray="3 4" /><text x="0" y={y + 3.5} fill="#929b96" fontSize="9.5">{value === 0 ? "$0" : `$${Math.round(value / 100000)} mil`}</text></g>; })}<path d={`${curve(points)} L 600 147 L 57 147 Z`} fill={`url(#${gradient})`} /><path d={curve(acceptedPoints)} fill="none" stroke="#a7d4c1" strokeWidth="2" strokeDasharray="4 4" /><path d={curve(points)} fill="none" stroke="#26a37f" strokeWidth="2.6" strokeLinecap="round" />{points.map((point, index) => <g key={data[index].key} onMouseEnter={() => setHover(index)}><rect x={point.x - 543 / (months - 1) / 2} y="0" width={543 / (months - 1)} height="175" fill="transparent" /><circle cx={point.x} cy={point.y} r={hover === index ? 5 : 3.4} fill="white" stroke="#26a37f" strokeWidth="2" /><text x={point.x} y="171" textAnchor="middle" fill="#89928c" fontSize="10" className="chart-month">{data[index].label.charAt(0).toUpperCase() + data[index].label.slice(1)}</text></g>)}</svg>{hover !== null && <div className="chart-tooltip" style={{ left: `${Math.max(16, Math.min(77, points[hover].x / 620 * 100))}%`, top: "12px" }}><span>{data[hover].fullLabel}</span><strong>{money(data[hover].total, currency)}</strong><small>Aceptado: {money(data[hover].accepted, currency)}</small></div>}</div><div className="chart-legend"><span><i className="legend-dot green" />Total cotizado</span><span><i className="legend-dot light-green" />Total aceptado</span></div></section>;
}

export function StatusChart({ quotes, onFilter }: { quotes: Quote[]; onFilter: (status: QuoteStatus) => void }) {
  const statuses: QuoteStatus[] = ["accepted", "sent", "review", "draft", "rejected", "archived"];
  const labels: Partial<Record<QuoteStatus, string>> = { accepted: "Aprobadas", sent: "Enviadas", review: "En revisión", draft: "Borradores", rejected: "Rechazadas", archived: "Archivadas", expired: "Vencidas" };
  const circumference = 2 * Math.PI * 55;
  let offset = 0;
  const accepted = quotes.filter((quote) => quote.status === "accepted").length;
  const conversion = quotes.length ? Math.round(accepted / quotes.length * 100) : 0;
  return <section className="card status-card"><div className="card-heading"><div><h2>Cada cotización cuenta</h2><p>Así se distribuyen tus oportunidades.</p></div><span className="info-icon" title="Estados de las cotizaciones del período seleccionado"><Info size={16} /></span></div><div className="status-chart-body"><div className="donut"><svg viewBox="0 0 140 140" role="img" aria-label={`${quotes.length} cotizaciones, ${conversion}% aceptadas`}><circle cx="70" cy="70" r="55" fill="none" stroke="#f0f3f1" strokeWidth="17" />{statuses.map((status) => { const count = quotes.filter((quote) => quote.status === status).length; const length = quotes.length ? count / quotes.length * circumference : 0; const start = offset; offset += length; return <circle key={status} cx="70" cy="70" r="55" fill="none" stroke={statusMeta[status].color} strokeWidth="17" strokeDasharray={`${Math.max(0, length - (count ? 4 : 0))} ${circumference}`} strokeDashoffset={-start} transform="rotate(-90 70 70)" />; })}</svg><div className="donut-label"><strong>{quotes.length}</strong><span>cotizaciones</span></div></div><div className="status-legend">{statuses.map((status) => <button key={status} onClick={() => onFilter(status)}><span><i style={{ background: statusMeta[status].color }} />{labels[status]}</span><strong>{quotes.filter((quote) => quote.status === status).length}</strong></button>)}</div></div><div className="conversion-note"><span className="conversion-icon"><TrendingUp size={18} /></span><span><strong>{conversion}% de conversión</strong><span>{conversion >= 40 ? "¡Vas por muy buen camino!" : "Tu próxima oportunidad está por llegar."}</span></span><span className="conversion-sparkle">✧</span></div></section>;
}
