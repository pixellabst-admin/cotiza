"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutDashboard, FileText, Users, ChartNoAxesCombined, Settings2, CircleHelp, ChevronDown, ChevronsUpDown, ChevronRight, Bell, Plus, CalendarDays, CircleDollarSign, ArrowUpRight, ArrowRight, CheckCheck, Clock3, TrendingUp, Sparkles, MoreHorizontal, Menu, X, Search, Mail, Phone, Pencil, Trash2, Download, Copy, Send, ExternalLink, LoaderCircle, CheckCircle2, AlertCircle, ShieldCheck, Check, Heart, CloudCheck, Leaf, LogOut, ShoppingBag, MessageSquareText, FileSpreadsheet, FileDown, ReceiptText } from "lucide-react";
import type { AppData, Business, Customer, Period, Quote, QuoteStatus, Sale, ShareChannel, View } from "@/lib/types";
import { dateInput, formatDate, inPeriod, initials, money } from "@/lib/utils";
import { downloadChangesExcel, downloadChangesPdf, downloadCsv, downloadExpensesCsv, downloadExpensesExcel, downloadExpensesPdf, downloadPaymentReceipt, downloadQuotePdf, downloadQuotesPdfReport, downloadSalesPdfReport } from "@/lib/export";
import { ActivityChart, StatusChart } from "./charts";
import { QuoteTable } from "./quote-table";
import { Avatar, Brand, EmptyState, Modal, StatusBadge } from "./ui";
import { CustomerForm, QuoteEditor, SettingsForm, type CustomerInput } from "./forms";
import { ShareModal } from "./share-modal";
import { QuoteDocument } from "./quote-document";
import { SalesDesk, downloadSalesCsv } from "./sales";
import { ExpensesDesk, expenseCategories } from "./expenses";
import { ThankYouModal } from "./thank-you-modal";

type ModalState = { type: "quote"; id?: number; customerId?: number } | { type: "detail"; id: number } | { type: "share"; id: number; channel?: ShareChannel } | { type: "thanks"; id: number } | { type: "customer"; id?: number } | { type: "delete"; entity: "quote" | "customer" | "sale" | "expense"; id: number } | { type: "help" } | null;
type Toast = { message: string; type: "success" | "error"; id: number } | null;
const viewLabels: Record<View, string> = { dashboard: "Panel general", quotes: "Cotizaciones", customers: "Clientes", sales: "Ventas", expenses: "Gastos", reports: "Reportes", settings: "Configuración" };
const navigation = [{ view: "dashboard" as View, label: "Panel general", icon: LayoutDashboard }, { view: "quotes" as View, label: "Cotizaciones", icon: FileText }, { view: "customers" as View, label: "Clientes", icon: Users }, { view: "sales" as View, label: "Ventas", icon: ShoppingBag }, { view: "expenses" as View, label: "Gastos", icon: ReceiptText }, { view: "reports" as View, label: "Reportes", icon: ChartNoAxesCombined }];
const isView = (value: string | null): value is View => value !== null && ["dashboard", "quotes", "customers", "sales", "expenses", "reports", "settings"].includes(value);

export function Workspace({ initialData, initialView = "dashboard", user }: { initialData: AppData; initialView?: View; user: { email: string; name: string } }) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>(initialView);
  const [period, setPeriod] = useState<Period>("month");
  const [filter, setFilter] = useState<QuoteStatus | "all">("all");
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [working, setWorking] = useState(false);
  const [pdfId, setPdfId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [reportMenu, setReportMenu] = useState(false);
  const currencyQuotes = useMemo(() => data.quotes.filter((quote) => quote.currency === data.settings.currency), [data.quotes, data.settings.currency]);
  const periodQuotes = useMemo(() => inPeriod(currencyQuotes, period), [currencyQuotes, period]);
  const monthQuotes = inPeriod(data.quotes, "month");
  const periodLabel = period === "year" ? String(new Date().getFullYear()) : period === "previous" ? dateInput(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)).slice(0, 7) : dateInput().slice(0, 7);
  const periodSales = data.sales.filter((sale) => sale.soldAt.startsWith(periodLabel));
  const periodExpenses = data.expenses.filter((expense) => expense.spentAt.startsWith(periodLabel));
  const periodChangeRows = data.quotes.filter((quote) => quote.status === "changes" && quote.issueDate.startsWith(periodLabel)).map((quote) => ({ quote, customer: data.customers.find((customer) => customer.id === quote.customerId) })).filter((item): item is { quote: Quote; customer: Customer } => Boolean(item.customer));
  const pending = monthQuotes.filter((quote) => quote.status === "sent");
  const accepted = monthQuotes.filter((quote) => quote.status === "accepted");
  const commented = data.quotes
    .filter((quote) => quote.status === "changes" || ((quote.status === "rejected" || quote.status === "review") && Boolean(quote.decisionNote?.trim())))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const activeQuote = modal && "id" in modal ? data.quotes.find((quote) => quote.id === modal.id) : undefined;
  const activeCustomer = activeQuote ? data.customers.find((customer) => customer.id === activeQuote.customerId) : undefined;
  const firstName = data.settings.ownerName.trim().split(" ")[0];

  useEffect(() => {
    const onPop = () => { const value = new URLSearchParams(window.location.search).get("view"); setView(isView(value) ? value : "dashboard"); setFilter("all"); setModal(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 5000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") { setNotificationsOpen(false); setSidebarOpen(false); } }
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  function notify(message: string, type: "success" | "error" = "success") { setToast({ message, type, id: Date.now() }); }
  async function signOut() {
    setWorking(true);
    try {
      await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
      window.location.assign("/login");
    } catch { setWorking(false); notify("No pudimos cerrar la sesión. Inténtalo de nuevo.", "error"); }
  }
  function navigate(next: View, nextFilter: QuoteStatus | "all" = "all") {
    setView(next); setFilter(nextFilter); setSidebarOpen(false); setNotificationsOpen(false);
    window.history.pushState(null, "", next === "dashboard" ? "/" : `/?view=${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function mutate(action: string, payload: object = {}): Promise<{ data: AppData; resultId?: number }> {
    setWorking(true);
    try {
      const response = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos completar la operación");
      setData(result.data); return result;
    } finally { setWorking(false); }
  }
  async function duplicate(quote: Quote) {
    try { const result = await mutate("duplicateQuote", { id: quote.id }); notify("Cotización duplicada. Dale tu toque personal."); setModal({ type: "quote", id: result.resultId }); }
    catch (error) { notify(error instanceof Error ? error.message : "No pudimos duplicar la cotización", "error"); }
  }
  async function pdf(quote: Quote) {
    const customer = data.customers.find((customer) => customer.id === quote.customerId);
    if (!customer) return;
    setPdfId(quote.id);
    try {
      await downloadQuotePdf(quote, customer, data.settings);
      const hasSocial = Boolean(data.settings.website || data.settings.facebook || data.settings.instagram || data.settings.tiktok);
      notify(hasSocial ? "PDF listo. Las redes están en la última página." : "PDF listo. No hay redes guardadas: ve a Configuración, llénalas y guarda.");
    }
    catch { notify("No pudimos generar el PDF. Inténtalo de nuevo.", "error"); }
    finally { setPdfId(null); }
  }
  async function updateStatus(quote: Quote, status: QuoteStatus) {
    try { await mutate("setStatus", { id: quote.id, status }); notify("Estado de la cotización actualizado."); }
    catch (error) { notify(error instanceof Error ? error.message : "No pudimos actualizar el estado", "error"); }
  }
  async function saveCustomer(input: CustomerInput) {
    const result = await mutate("saveCustomer", input);
    notify(input.id ? "Datos del cliente actualizados." : "Un nuevo cliente, nuevas posibilidades.");
    return result.resultId!;
  }
  async function remove() {
    if (modal?.type !== "delete") return;
    try { await mutate(modal.entity === "quote" ? "deleteQuote" : modal.entity === "sale" ? "deleteSale" : modal.entity === "expense" ? "deleteExpense" : "deleteCustomer", { id: modal.id }); notify(modal.entity === "quote" ? "Cotización eliminada." : modal.entity === "sale" ? "Venta eliminada." : modal.entity === "expense" ? "Gasto eliminado." : "Cliente eliminado."); setModal(null); }
    catch (error) { notify(error instanceof Error ? error.message : "No pudimos eliminar el elemento", "error"); }
  }
  function exportData(quotes: Quote[]) { downloadCsv(quotes, data.customers); notify(`${quotes.length} cotizaciones exportadas a CSV.`); }
  function showStatus(status: QuoteStatus) { setFilter(status); if (view === "dashboard") document.getElementById("cotizaciones")?.scrollIntoView({ behavior: "smooth", block: "start" }); else navigate("quotes", status); }
  const tableProps = { customers: data.customers, filter, onFilter: setFilter, onDetail: (quote: Quote) => setModal({ type: "detail", id: quote.id }), onEdit: (quote: Quote) => setModal({ type: "quote", id: quote.id }), onShare: (quote: Quote, channel?: ShareChannel) => setModal({ type: "share", id: quote.id, channel }), onThanks: (quote: Quote) => setModal({ type: "thanks", id: quote.id }), onDuplicate: duplicate, onDelete: (quote: Quote) => setModal({ type: "delete", entity: "quote", id: quote.id }), onPdf: pdf, onStatus: updateStatus, onExport: exportData, onNew: () => setModal({ type: "quote" }) };
  const filteredCustomers = data.customers.filter((customer) => `${customer.name} ${customer.contact} ${customer.email} ${customer.phone}`.toLocaleLowerCase("es").includes(customerSearch.toLocaleLowerCase("es")));

  return <div className="app-shell">{sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}<aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}><div className="sidebar-brand"><button onClick={() => navigate("dashboard")} aria-label="Cotiza, panel general"><Brand /></button><button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú"><X size={19} /></button></div><button className="workspace-switcher" onClick={() => navigate("settings")}><span className="workspace-icon">{initials(data.settings.name).slice(0, 1)}</span><span><strong>{data.settings.name}</strong><small>Mi espacio de trabajo</small></span><ChevronsUpDown size={14} /></button><div className="nav-section-label">PRINCIPAL</div><nav className="main-navigation" aria-label="Navegación principal">{navigation.map(({ view: navView, label, icon: Icon }) => <button key={navView} className={`nav-item ${view === navView ? "active" : ""}`} onClick={() => navigate(navView)} aria-current={view === navView ? "page" : undefined}><Icon size={19} strokeWidth={1.7} /><span>{label}</span>{navView === "quotes" && <span className="nav-count">{monthQuotes.length}</span>}</button>)}</nav><div className="sidebar-bottom"><nav className="secondary-navigation" aria-label="Preferencias"><button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><Settings2 size={19} strokeWidth={1.7} /><span>Configuración</span></button><button className="nav-item" onClick={() => setModal({ type: "help" })}><CircleHelp size={19} strokeWidth={1.7} /><span>Centro de ayuda</span><ArrowUpRight size={14} className="nav-end-icon" /></button></nav><section className="sidebar-tip"><span className="tip-sparkle"><Sparkles size={18} /></span><h3>Menos papeleo.<br />Más posibilidades.</h3><p>Tu talento merece tiempo.<br />Nosotros te ayudamos a ganarlo.</p><button onClick={() => setModal({ type: "help" })}>Descubre cómo<ArrowUpRight size={15} /></button><div className="tip-decoration" aria-hidden="true"><Leaf size={51} strokeWidth={.8} /></div></section><div className="sidebar-profile"><button className="profile-main" onClick={() => navigate("settings")} title="Configuración de tu negocio"><Avatar name={user.name || data.settings.ownerName} color="sand" /><span><strong>{user.name || data.settings.ownerName}</strong><small>{user.email}</small></span></button><button className="icon-button" title="Cerrar sesión" aria-label="Cerrar sesión" disabled={working} onClick={signOut}><LogOut size={17} /></button></div></div></aside><div className="workspace-main"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Menu size={21} /></button><LayoutDashboard size={16} strokeWidth={1.6} className="breadcrumb-icon" /><span className="breadcrumb-slash">/</span><span>{viewLabels[view]}</span></div><div className="topbar-right"><span className="workspace-status"><i />Tu espacio, en orden</span><button className="topbar-help" onClick={() => setModal({ type: "help" })}><CircleHelp size={17} />¿Necesitas ayuda?</button><span className="topbar-divider" /><div className="notification-anchor"><button className={`icon-button notification-button ${notificationsOpen ? "selected" : ""}`} aria-label="Ver notificaciones" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={19} strokeWidth={1.65} />{pending.length > 0 && !notificationsRead && <i />}</button>{notificationsOpen && <><div className="notification-dismiss" onClick={() => setNotificationsOpen(false)} /><section className="notification-panel"><div className="notification-heading"><h3>Tu actividad</h3><button className="text-button" onClick={() => setNotificationsRead(true)}>{notificationsRead ? "Todo al día" : "Marcar como leídas"}<CheckCheck size={14} /></button></div><button className="notification-row" onClick={() => navigate("quotes", "accepted")}><span className="notification-icon mint"><CheckCircle2 size={20} /></span><span><strong>{accepted.length} proyectos con un sí</strong><small>Cotizaciones aceptadas este mes.</small></span><ChevronRight size={15} /></button><button className="notification-row" onClick={() => navigate("quotes", "sent")}><span className="notification-icon amber"><Clock3 size={20} /></span><span><strong>{pending.length} oportunidades esperando</strong><small>Un seguimiento puede hacer la diferencia.</small></span><ChevronRight size={15} /></button><button className="notification-row" onClick={() => navigate("settings")}><span className="notification-icon blue"><ShieldCheck size={20} /></span><span><strong>Dale tu identidad a cada propuesta</strong><small>Revisa la información de tu negocio.</small></span><ChevronRight size={15} /></button></section></>}</div><button className="topbar-avatar" aria-label="Mi perfil" onClick={() => navigate("settings")}><Avatar name={data.settings.ownerName} color="sand" small /></button></div></header>{working && <div className="global-progress" />}<main className="page-content"><div className="page-heading"><div><h1>{view === "dashboard" ? <>Hola, {firstName} <span className="greeting-wave">👋</span></> : view === "quotes" ? "Tus cotizaciones" : view === "customers" ? "Tus clientes" : view === "sales" ? "Caja y ventas" : view === "reports" ? "Cada número, una oportunidad" : "Tu negocio, a tu manera"}</h1><p>{view === "dashboard" ? "Un vistazo a tu negocio. Y a todo lo que viene." : view === "quotes" ? "De una buena propuesta a tu próximo gran proyecto." : view === "customers" ? "Buenas relaciones. Grandes proyectos. Todo empieza aquí." : view === "sales" ? "Registra cobros, mira el mes y convierte cotizaciones aprobadas en ventas." : view === "reports" ? "Entiende lo que funciona y descubre hacia dónde crecer." : "Pequeños ajustes para que cada propuesta hable de ti."}</p></div><div className="heading-actions">{(view === "dashboard" || view === "reports" || view === "sales") && <label className="select-button period-select"><CalendarDays size={16} /><select value={period} onChange={(event) => setPeriod(event.target.value as Period)} aria-label="Período del panel"><option value="month">Este mes</option><option value="previous">Mes anterior</option><option value="year">Este año</option></select><ChevronDown size={13} /></label>}{view === "reports" ? <div className="report-export-wrap">
        <button className="button button-primary" onClick={() => setReportMenu((value) => !value)} aria-expanded={reportMenu}><Download size={16} />Generar reporte<ChevronDown size={14} /></button>
        {reportMenu && <>
          <div className="menu-dismiss" onClick={() => setReportMenu(false)} />
          <div className="action-menu report-export-menu" role="menu">
            <div className="report-menu-title">Cotizaciones del período</div>
            <button role="menuitem" onClick={() => { setReportMenu(false); exportData(periodQuotes); }}><FileDown size={15} />Excel / CSV de cotizaciones</button>
            <button role="menuitem" onClick={() => { setReportMenu(false); void downloadQuotesPdfReport(periodQuotes, data.customers, data.settings, period); }}><FileDown size={15} />PDF de cotizaciones</button>
            <div className="report-menu-title">Ventas del período</div>
            <button role="menuitem" onClick={() => { setReportMenu(false); downloadSalesCsv(periodSales); }}><FileSpreadsheet size={15} />Excel / CSV de ventas</button>
            <button role="menuitem" onClick={() => { setReportMenu(false); void downloadSalesPdfReport(periodSales, data.settings, period); }}><FileDown size={15} />PDF de ventas</button>
            <div className="report-menu-title">Cambios del cliente</div>
            <button role="menuitem" onClick={() => { setReportMenu(false); void downloadChangesExcel(periodChangeRows.map(({ quote, customer }) => ({ quote, customer })), periodLabel); }}><FileSpreadsheet size={15} />Excel de cambios</button>
            <button role="menuitem" onClick={() => { setReportMenu(false); void downloadChangesPdf(periodChangeRows.map(({ quote, customer }) => ({ quote, customer })), data.settings, periodLabel); }}><FileDown size={15} />PDF de cambios</button>
          </div>
        </>}
      </div> : view !== "settings" && <button className="button button-primary" onClick={() => setModal({ type: view === "customers" ? "customer" : "quote" })}><Plus size={18} />{view === "customers" ? "Nuevo cliente" : "Nueva cotización"}</button>}</div></div>

    {view === "dashboard" && commented.length > 0 && <section className="card comments-inbox">
      <div className="comments-inbox-head"><span className="comments-icon"><MessageSquareText size={18} /></span><div><h2>Comentarios de clientes</h2><p>{commented.length} {commented.length === 1 ? "cotización necesita tu revisión" : "cotizaciones necesitan tu revisión"}.</p></div><button className="text-button" onClick={() => { setFilter("changes"); navigate("quotes", "changes"); }}>Ver todas</button></div>
      <div className="comments-inbox-list">{commented.slice(0, 4).map((quote) => {
        const customer = data.customers.find((item) => item.id === quote.customerId);
        return <button key={quote.id} className="comment-inbox-row" onClick={() => setModal({ type: "detail", id: quote.id })}>
          <Avatar name={customer?.name ?? "Cliente"} color={customer?.color ?? "mint"} small />
          <div><strong>{quote.number} · {customer?.name ?? "Cliente"}</strong><p>{quote.decisionNote?.split("\n\n").pop() || quote.decisionNote || "El cliente dejó un comentario."}</p></div>
          <ChevronRight size={16} />
        </button>;
      })}</div>
    </section>}

    {(view === "dashboard" || view === "reports") && <><Stats quotes={periodQuotes} allQuotes={currencyQuotes} period={period} currency={data.settings.currency} /><div className="charts-grid"><ActivityChart quotes={currencyQuotes} currency={data.settings.currency} /><StatusChart quotes={periodQuotes} onFilter={showStatus} /></div></>}

    {view === "dashboard" && <QuoteTable {...tableProps} quotes={periodQuotes} compact onAll={() => navigate("quotes")} />}

    {view === "quotes" && <><div className="quote-view-summary"><span><span className="summary-icon"><FileText size={19} /></span><strong>{data.quotes.length}</strong> propuestas con tu sello</span><span><i className="summary-dot" />{data.quotes.filter((quote) => quote.status === "sent").length} esperando una respuesta</span><span className="summary-right">Cada propuesta es una nueva posibilidad.<Sparkles size={16} /></span></div><QuoteTable {...tableProps} quotes={data.quotes} /></>}

    {view === "customers" && <><div className="customers-toolbar"><div className="heading-with-count"><h2>Tu comunidad de clientes</h2><span className="count-pill">{data.customers.length}</span></div><div className="search-field customer-search"><Search size={17} /><input aria-label="Buscar cliente" placeholder="Buscar nombre, contacto o correo..." value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} />{customerSearch && <button className="search-clear" onClick={() => setCustomerSearch("")} aria-label="Limpiar búsqueda"><X size={14} /></button>}</div></div><div className="customer-grid">{filteredCustomers.map((customer) => { const customerQuotes = data.quotes.filter((quote) => quote.customerId === customer.id); return <section className="card customer-card" key={customer.id}><div className="customer-card-top"><Avatar name={customer.name} color={customer.color} /><div><button className="icon-button" title="Editar cliente" aria-label={`Editar ${customer.name}`} onClick={() => setModal({ type: "customer", id: customer.id })}><Pencil size={15} /></button><button className="icon-button danger-hover" title="Eliminar cliente" aria-label={`Eliminar ${customer.name}`} onClick={() => setModal({ type: "delete", entity: "customer", id: customer.id })}><Trash2 size={15} /></button></div></div><h3>{customer.name}</h3><p className="customer-contact">{customer.contact || "Tu próximo gran proyecto"}</p><div className="customer-contact-details"><span><Mail size={15} />{customer.email ? <a href={`mailto:${customer.email}`}>{customer.email}</a> : <span>Sin correo registrado</span>}</span><span><Phone size={15} />{customer.phone ? <a href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{customer.phone}</a> : <span>Sin teléfono registrado</span>}</span></div><div className="customer-card-footer"><span><FileText size={14} />{customerQuotes.length} cotizaciones</span><button className="text-button" onClick={() => setModal({ type: "quote", customerId: customer.id })}>Cotizar<Plus size={15} /></button></div></section>; })}</div>{!filteredCustomers.length && <section className="card"><EmptyState title={customerSearch ? "No encontramos a ese cliente" : "Tu próxima gran relación empieza aquí"} description={customerSearch ? "Prueba con otro nombre o correo electrónico." : "Agrega tu primer cliente para preparar una propuesta personalizada."} onAction={customerSearch ? () => setCustomerSearch("") : () => setModal({ type: "customer" })} action={customerSearch ? "Limpiar búsqueda" : "Nuevo cliente"} /></section>}</>}

    {view === "sales" && <SalesDesk data={data} periodPrefix={period === "year" ? String(new Date().getFullYear()) : period === "previous" ? dateInput(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)).slice(0, 7) : dateInput().slice(0, 7)} onSave={async (input) => { await mutate("saveSale", input); notify(input.id ? "Venta actualizada." : "Venta registrada. Que se multiplique."); }} onDelete={(sale) => setModal({ type: "delete", entity: "sale", id: sale.id })} onFromQuote={async (quote) => { await mutate("saleFromQuote", { id: quote.id }); notify(`Venta creada desde ${quote.number}.`); }} onExport={() => { downloadSalesCsv(data.sales); notify("Ventas exportadas a CSV."); }} onReceipt={(sale) => { const customer = data.customers.find((item) => item.id === sale.customerId); void downloadPaymentReceipt(sale, customer, data.settings); }} />}
    {view === "expenses" && <ExpensesDesk data={data} periodPrefix={periodLabel} onSave={async (input) => { const { amount, id, ...values } = input; await mutate("saveExpense", { ...values, amount, id }); notify(id ? "Gasto actualizado." : "Compra o gasto registrado."); }} onDelete={(expense) => setModal({ type: "delete", entity: "expense", id: expense.id })} onExportCsv={() => { downloadExpensesCsv(periodExpenses); notify("Gastos exportados a CSV."); }} onExportExcel={() => { void downloadExpensesExcel(periodExpenses); notify("Gastos exportados a Excel."); }} onExportPdf={() => { void downloadExpensesPdf(periodExpenses, data.settings, periodLabel); }} />}
    {view === "reports" && <>
      <ChangesReport allQuotes={data.quotes} customers={data.customers} settings={data.settings} period={period} periodPrefix={period === "year" ? String(new Date().getFullYear()) : period === "previous" ? dateInput(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)).slice(0, 7) : dateInput().slice(0, 7)} />
      <ClientReport quotes={periodQuotes} customers={data.customers} currency={data.settings.currency} />
    </>}
    {view === "settings" && <SettingsForm business={data.settings} onSave={async (input: Business) => { await mutate("saveSettings", input); notify("Tu negocio ya tiene tu toque personal. Cambios guardados."); }} onResetNumbers={async () => { await mutate("resetQuoteNumbers"); notify("La próxima cotización nueva volverá a empezar la numeración."); }} />}
    <footer className="page-footer"><span>Hecho para que tu negocio crezca.<Heart size={11} /></span><span><CloudCheck size={14} />{working ? "Guardando cambios..." : "Todo guardado, todo en su lugar."}</span></footer></main></div>

    {modal?.type === "quote" && <QuoteEditor data={data} quote={activeQuote} initialCustomerId={modal.customerId} onClose={() => setModal(null)} onSaveCustomer={saveCustomer} onSave={async (input, share) => { const result = await mutate("saveQuote", input); notify(input.id ? "Tu cotización está actualizada." : "¡Una nueva propuesta lista para brillar!"); if (share && result.resultId) setModal({ type: "share", id: result.resultId }); else setModal(null); }} />}
    {modal?.type === "customer" && <CustomerForm customer={data.customers.find((customer) => customer.id === modal.id)} onClose={() => setModal(null)} onSave={async (input) => { await saveCustomer(input); setModal(null); }} />}
    {modal?.type === "thanks" && activeQuote && activeCustomer && <ThankYouModal quote={activeQuote} customer={activeCustomer} business={data.settings} onClose={() => setModal(null)} onSave={async ({ message, photo }) => { const result = await mutate("saveThankYou", { id: activeQuote.id, message, photo }); notify("Agradecimiento guardado. Abre WhatsApp o el correo y confirma el envío."); const updated = result.data.quotes.find((item: Quote) => item.id === activeQuote.id); if (!updated) throw new Error("No encontramos la cotización actualizada"); return updated; }} />}
    {modal?.type === "share" && activeQuote && activeCustomer && <ShareModal quote={activeQuote} customer={activeCustomer} business={data.settings} initialChannel={modal.channel} onClose={() => setModal(null)} onRecordShare={async (channel) => { await mutate("recordShare", { id: activeQuote.id, channel }); }} onMarkSent={async () => { await mutate("setStatus", { id: activeQuote.id, status: "sent" }); notify("Cotización marcada como enviada. ¡Que llegue ese sí!"); setModal(null); }} />}
    {modal?.type === "detail" && activeQuote && activeCustomer && <Modal wide title={`Cotización ${activeQuote.number}`} subtitle="Cada detalle de tu propuesta, en un solo lugar." onClose={() => setModal(null)} className="quote-detail"><div className="detail-toolbar"><label>Estado<select aria-label="Cambiar estado de la cotización" value={activeQuote.status} disabled={working} onChange={(event) => updateStatus(activeQuote, event.target.value as QuoteStatus)}><option value="draft">Borrador</option><option value="sent">Enviada</option><option value="changes">Comentada</option><option value="review">En revisión</option><option value="accepted">Aprobada</option><option value="rejected">Rechazada</option><option value="archived">Archivada</option></select></label><a className="text-button" href={`/cotizacion/${activeQuote.shareToken}`} target="_blank" rel="noreferrer">Ver enlace público<ExternalLink size={14} /></a></div><div className="modal-body document-preview"><QuoteDocument quote={activeQuote} customer={activeCustomer} business={data.settings} /></div><footer className="modal-footer detail-footer"><div><button className="text-button" disabled={working} onClick={() => duplicate(activeQuote)}><Copy size={15} />Duplicar</button><button className="text-button" disabled={activeQuote.status === "accepted"} title={activeQuote.status === "accepted" ? "Duplica la cotización aceptada para modificarla" : "Editar cotización"} onClick={() => setModal({ type: "quote", id: activeQuote.id })}><Pencil size={15} />Editar</button></div><div><button className="button button-secondary" disabled={pdfId === activeQuote.id} onClick={() => pdf(activeQuote)}>{pdfId === activeQuote.id ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}PDF</button><button className="button button-secondary" onClick={() => setModal({ type: "thanks", id: activeQuote.id })}>Agradecer compra</button>{activeQuote.status === "accepted" && !data.sales.some((sale) => sale.quoteId === activeQuote.id) && <button className="button button-secondary" disabled={working} onClick={async () => { try { await mutate("saleFromQuote", { id: activeQuote.id }); notify("Venta registrada desde la cotización."); setModal(null); navigate("sales"); } catch (error) { notify(error instanceof Error ? error.message : "No pudimos crear la venta", "error"); } }}>Registrar venta</button>}<button className="button button-primary" onClick={() => setModal({ type: "share", id: activeQuote.id })}><Send size={15} />Enviar cotización</button></div></footer></Modal>}
    {modal?.type === "delete" && <Modal title={modal.entity === "quote" ? "¿Eliminar esta cotización?" : modal.entity === "sale" ? "¿Eliminar esta venta?" : modal.entity === "expense" ? "¿Eliminar este gasto?" : "¿Eliminar este cliente?"} subtitle="Un momento para asegurarnos." onClose={() => { if (!working) setModal(null); }}><div className="modal-body delete-body"><span className="delete-icon"><Trash2 size={27} /></span><p>{modal.entity === "quote" ? <>Vas a eliminar <strong>{data.quotes.find((quote) => quote.id === modal.id)?.number}</strong>. Su enlace público dejará de estar disponible.</> : modal.entity === "sale" ? <>Vas a eliminar <strong>{data.sales.find((sale) => sale.id === modal.id)?.number}</strong>.</> : modal.entity === "expense" ? <>Vas a eliminar <strong>{data.expenses.find((expense) => expense.id === modal.id)?.number}</strong>.</> : <>Vas a eliminar a <strong>{data.customers.find((customer) => customer.id === modal.id)?.name}</strong>. Los clientes con cotizaciones asociadas no se pueden eliminar.</>}</p><p className="field-help">Esta acción no se puede deshacer.</p></div><footer className="modal-footer"><button className="button button-secondary" disabled={working} onClick={() => setModal(null)}>Mejor conservar{modal.entity === "quote" ? "la" : "lo"}</button><button className="button button-danger" disabled={working} onClick={remove}>{working ? <LoaderCircle size={15} className="spin" /> : <Trash2 size={15} />}Sí, eliminar</button></footer></Modal>}
    {modal?.type === "help" && <Modal title="Tu talento. Una buena propuesta." subtitle="Te acompañamos del primer borrador al próximo gran proyecto." onClose={() => setModal(null)} className="help-modal"><div className="modal-body"><div className="help-welcome"><span><Sparkles size={26} /></span><div><h3>Menos pasos. Más posibilidades.</h3><p>Cotiza te ayuda a presentar tu trabajo como se merece.</p></div></div><div className="help-steps">{[{ title: "Dale forma a tu propuesta", text: "Elige un cliente, agrega tus productos o servicios y define precios, impuestos y condiciones.", icon: FileText }, { title: "Compártela a tu manera", text: "Abre WhatsApp o tu aplicación de correo con un mensaje preparado. Confirma el envío allí y marca la cotización como enviada.", icon: Send }, { title: "Haz espacio para un nuevo sí", text: "Tu cliente puede consultar el enlace, descargar el PDF y aceptar la propuesta sin crear una cuenta.", icon: CheckCircle2 }].map(({ title, text, icon: Icon }, index) => <div key={title}><span className="help-step-number">0{index + 1}</span><div><h4>{title}</h4><p>{text}</p></div><Icon size={21} /></div>)}</div><div className="help-faq"><details><summary>¿Qué necesito para usar Cotiza por Internet?<ChevronDown size={16} /></summary><p>Necesitas alojamiento para Next.js, una base PostgreSQL en la nube y protección de acceso. Recomendamos Vercel y Neon. Esta versión aún no tiene login para el administrador: úsala detrás de una protección privada hasta añadirlo.<br /><a className="text-button" href="/instalar#publicar-web">Ver requisitos y pasos de publicación<ArrowUpRight size={14} /></a></p></details><details><summary>¿Cómo veo la base de datos y sus tablas?<ChevronDown size={16} /></summary><p>Usa Drizzle Studio desde tu instalación local para consultar clientes, cotizaciones y la configuración del negocio. No necesitas compartir tu contraseña. Studio también permite editar y borrar: úsalo con cuidado.<br /><a className="text-button" href="/instalar#base-de-datos">Ver los pasos para abrir las tablas<ArrowUpRight size={14} /></a></p></details><details><summary>¿Cómo abro Cotiza en mi computadora?<ChevronDown size={16} /></summary><p>Descarga el proyecto y sigue la guía para Windows, macOS o Linux. Necesitas Node.js y Docker Desktop. La descarga no incluye los datos de la vista previa.<br /><a className="text-button" href="/instalar">Ver guía y descargar proyecto<ArrowUpRight size={14} /></a></p></details><details><summary>¿Los mensajes se envían automáticamente?<ChevronDown size={16} /></summary><p>No. Cotiza abre WhatsApp o tu aplicación de correo con el texto preparado. Tú revisas y confirmas el envío. Después puedes marcar la cotización como enviada.</p></details><details><summary>¿Puedo descargar o adjuntar un PDF?<ChevronDown size={16} /></summary><p>Sí. Abre una cotización y selecciona «PDF». El archivo se descarga en tu dispositivo y puedes adjuntarlo a cualquier mensaje. Tu cliente también puede descargarlo desde el enlace público.</p></details><details><summary>¿De dónde vienen los datos iniciales?<ChevronDown size={16} /></summary><p>Tu espacio incluye clientes y cotizaciones de demostración para explorar la aplicación. Puedes editarlos o eliminarlos. Personaliza tu nombre y los datos del negocio en Configuración antes de enviar propuestas reales.</p></details></div></div><footer className="modal-footer"><button className="button button-secondary" onClick={() => { setModal(null); navigate("settings"); }}>Configurar mi negocio</button><button className="button button-primary" onClick={() => setModal({ type: "quote" })}>Crear cotización<ArrowRight size={16} /></button></footer></Modal>}
    <div className="toast-region" aria-live="polite" aria-atomic="true">{toast && <div className={`toast toast-${toast.type}`}>{toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}<span>{toast.message}</span><button className="icon-button" onClick={() => setToast(null)} aria-label="Cerrar aviso"><X size={16} /></button></div>}</div>
  </div>;
}

function Stats({ quotes, allQuotes, period, currency }: { quotes: Quote[]; allQuotes: Quote[]; period: Period; currency: string }) {
  const now = new Date();
  const previous = period === "month" ? inPeriod(allQuotes, "previous") : period === "previous" ? allQuotes.filter((quote) => quote.issueDate.startsWith(dateInput(new Date(now.getFullYear(), now.getMonth() - 2, 1)).slice(0, 7))) : allQuotes.filter((quote) => quote.issueDate.startsWith(String(now.getFullYear() - 1)));
  const total = quotes.reduce((sum, quote) => sum + quote.totalCents, 0);
  const previousTotal = previous.reduce((sum, quote) => sum + quote.totalCents, 0);
  const change = previousTotal ? (total - previousTotal) / previousTotal * 100 : 0;
  const sent = quotes.filter((quote) => quote.status !== "draft").length;
  const accepted = quotes.filter((quote) => quote.status === "accepted").length;
  const pending = quotes.filter((quote) => quote.status === "sent").length;
  const conversion = quotes.length ? Math.round(accepted / quotes.length * 100) : 0;
  return <div className="stats-grid"><section className="card stat-card"><div className="stat-heading"><span>Total cotizado</span><span className="stat-icon"><CircleDollarSign size={19} strokeWidth={1.6} /></span></div><div className="stat-value"><strong>{money(total, currency, false)}</strong><span>{currency}</span></div><div className="stat-footer"><span className={`trend-pill ${change < 0 ? "negative" : ""}`}><TrendingUp size={12} />{change >= 0 ? "+" : ""}{change.toFixed(1)}%</span><span>{period === "year" ? "vs. año anterior" : "vs. mes anterior"}</span></div></section><section className="card stat-card"><div className="stat-heading"><span>Cotizaciones creadas</span><span className="stat-icon"><FileText size={19} strokeWidth={1.6} /></span></div><div className="stat-value"><strong>{quotes.length}</strong></div><div className="stat-footer"><span className="trend-pill"><ArrowUpRight size={12} />{sent} enviadas</span><span>a tus clientes</span></div></section><section className="card stat-card"><div className="stat-heading"><span>Cotizaciones aceptadas</span><span className="stat-icon mint-icon"><CheckCheck size={19} strokeWidth={1.6} /></span></div><div className="stat-value"><strong>{accepted}</strong></div><div className="stat-footer"><span className="trend-pill"><TrendingUp size={12} />{conversion}%</span><span>tasa de conversión</span></div></section><section className="card stat-card"><div className="stat-heading"><span>Por dar seguimiento</span><span className="stat-icon amber-icon"><Clock3 size={19} strokeWidth={1.6} /></span></div><div className="stat-value"><strong>{pending}</strong><span className="opportunity-label">oportunidades</span></div><div className="stat-footer"><span className="amber-dot" /><span>{pending ? "Esperando una respuesta" : "Todo al día. ¡Buen trabajo!"}</span></div></section></div>;
}

function ChangesReport({ allQuotes, customers, settings, period, periodPrefix }: { allQuotes: Quote[]; customers: Customer[]; settings: Business; period: Period; periodPrefix: string }) {
  const changes = allQuotes.filter((quote) => quote.status === "changes" && quote.issueDate.startsWith(periodPrefix));
  const rows = changes.map((quote) => ({ quote, customer: customers.find((customer) => customer.id === quote.customerId) })).filter((item): item is { quote: Quote; customer: Customer } => Boolean(item.customer));
  const byCustomer = customers.map((customer) => ({ customer, items: rows.filter((row) => row.customer.id === customer.id) })).filter((group) => group.items.length > 0);
  const periodLabel = period === "year" ? periodPrefix : new Date(periodPrefix + "-01T12:00:00").toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const [exporting, setExporting] = useState<"" | "pdf" | "excel">("");
  if (!changes.length) return null;
  async function exportPdf() { setExporting("pdf"); try { await downloadChangesPdf(rows, settings, periodLabel); } finally { setExporting(""); } }
  async function exportExcel() { setExporting("excel"); try { await downloadChangesExcel(rows, periodLabel); } finally { setExporting(""); } }
  return <section className="card client-report changes-report">
    <div className="card-heading"><div><h2>Cambios solicitados por clientes</h2><p>Comentarios para ajustar el producto y volver a enviar.</p></div><span className="report-badge"><MessageSquareText size={15} />{changes.length} cambios</span></div>
    <div className="changes-actions">
      <button className="button button-secondary button-sm" onClick={() => void exportPdf()} disabled={Boolean(exporting)}>{exporting === "pdf" ? <LoaderCircle size={14} className="spin" /> : <FileDown size={14} />}Exportar PDF</button>
      <button className="button button-secondary button-sm" onClick={() => void exportExcel()} disabled={Boolean(exporting)}>{exporting === "excel" ? <LoaderCircle size={14} className="spin" /> : <FileSpreadsheet size={14} />}Exportar Excel</button>
    </div>
    <div className="changes-list">
      {byCustomer.map(({ customer, items }) => <div key={customer.id} className="changes-group">
        <div className="changes-group-head"><Avatar name={customer.name} color={customer.color} small /><strong>{customer.name}</strong><span>{items.length} {items.length === 1 ? "cambio" : "cambios"}</span></div>
        {items.map(({ quote }) => <div key={quote.id} className="change-item">
          <div className="change-item-head"><span className="change-number">{quote.number}</span><span className="change-date">Vence {formatDate(quote.validUntil, true)}</span><strong className="change-total">{money(quote.totalCents, quote.currency)}</strong></div>
          <p className="change-note">{quote.decisionNote}</p>
        </div>)}
      </div>)}
    </div>
  </section>;
}

function ClientReport({ quotes, customers, currency }: { quotes: Quote[]; customers: Customer[]; currency: string }) {
  const ranked = customers.map((customer) => { const related = quotes.filter((quote) => quote.customerId === customer.id); return { customer, count: related.length, accepted: related.filter((quote) => quote.status === "accepted").length, total: related.reduce((sum, quote) => sum + quote.totalCents, 0) }; }).filter((item) => item.count).sort((a, b) => b.total - a.total);
  const max = ranked[0]?.total || 1;
  return <section className="card client-report"><div className="card-heading"><div><h2>Relaciones que hacen crecer tu negocio</h2><p>Los clientes que están convirtiendo tus propuestas en posibilidades.</p></div><span className="report-badge"><Users size={15} />{ranked.length} clientes activos</span></div>{ranked.length ? <div className="table-scroll"><table className="report-table"><thead><tr><th>Cliente</th><th>Cotizaciones</th><th>Aceptadas</th><th>Participación</th><th className="amount-cell">Total cotizado</th></tr></thead><tbody>{ranked.map(({ customer, count, accepted, total }, index) => <tr key={customer.id}><td><div className="report-customer"><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><Avatar name={customer.name} color={customer.color} small /><div><strong>{customer.name}</strong><span>{customer.contact}</span></div></div></td><td>{count}</td><td><span className="accepted-number"><Check size={13} />{accepted}</span></td><td><div className="report-bar"><span style={{ width: `${total / max * 100}%` }} /></div></td><td className="amount-cell"><strong>{money(total, currency)}</strong></td></tr>)}</tbody></table></div> : <EmptyState title="Tus próximos resultados empiezan con una propuesta" description="Crea cotizaciones en este período para ver las estadísticas de tus clientes." />}</section>;
}
