"use client";

import { Auth0Client, type User } from "@auth0/auth0-spa-js";
import { useEffect, useRef, useState } from "react";
import "./portal-auth.css";
import "./portal-remodel.css";

const auth0Domain = "visionadvisorslatam.us.auth0.com";
const auth0ClientId = "2ugfLDMQWdghmyfw9Ml0g0UG4uVBRC7Y";
const connection = "clientes-vision-advisors";

type PortalState = "loading" | "anonymous" | "authenticated" | "error";
type PortalData = {
  status: "unassigned" | "preparing" | "ready" | "unavailable";
  message?: string;
  organization?: { legalName: string; tradeName: string };
  period?: { year: number; month: number; publishedAt: string | null };
  snapshot?: {
    healthLabel: string;
    incomeMonthCents: number;
    incomeYtdCents?: number;
    deductionsMonthCents: number;
    deductionsYtdCents?: number;
    estimatedResultCents: number;
    executiveSummary: string;
    vatTransferredCents?: number;
    vatCreditableCents?: number;
    vatWithheldCents?: number;
    issuedCfdiCount?: number;
    receivedCfdiCount?: number;
    paymentDueDate?: string | null;
    filingStatus?: "determined" | "filed" | "paid";
  } | null;
  taxes?: { taxType: string; amountCents: number }[];
};
type PortalDocument = { id: string; title: string; category: string; fiscalType: "general" | "csf" | "opinion" | "acuse"; issueDate: string | null; opinionSense: string | null; validUntil: string | null; isCurrent: boolean; mimeType: string; sizeBytes: number; periodYear: number | null; periodMonth: number | null; publishedAt: string | null };
type HistoryPeriod = { id: string; year: number; month: number; publishedAt: string | null; snapshot: PortalData["snapshot"]; taxes: { taxType: string; amountCents: number; status: string; dueDate: string | null }[]; observations: { title: string; detail: string }[]; documentCount: number; generalDocumentCount: number };
type PortalMessage = { id: string; subject: string; body: string; type: "informative" | "action" | "urgent"; dueDate: string | null; documentId: string | null; readAt: string | null; createdAt: string };
type PortalBootstrap = { summary: PortalData; documents: { documents: PortalDocument[] }; history: { periods: HistoryPeriod[] }; messages: { messages: PortalMessage[] } };

async function fetchProtected(url: string, accessToken: string) {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (response.ok || ![429, 500, 502, 503, 504].includes(response.status)) return response;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return response!;
}

export default function ClientPortal() {
  const authRef = useRef<Auth0Client | null>(null);
  const tokenRef = useRef("");
  const [state, setState] = useState<PortalState>("loading");
  const [user, setUser] = useState<User | undefined>();
  const [portalData, setPortalData] = useState<PortalData>();
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [history, setHistory] = useState<HistoryPeriod[]>([]);
  const [documentMessage, setDocumentMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountingPeriodId, setAccountingPeriodId] = useState("");
  const [messages, setMessages] = useState<PortalMessage[]>([]);

  useEffect(() => {
    let active = true;
    const watchdog = window.setTimeout(() => {
      if (!active) return;
      setError("La validación está tardando más de lo esperado. Recargue la página para reintentar.");
      setState("error");
    }, 15_000);

    async function initializeAuth() {
      try {
        const redirectUri = `${window.location.origin}/portal`;
        const client = new Auth0Client({
          domain: auth0Domain,
          clientId: auth0ClientId,
          authorizationParams: { redirect_uri: redirectUri, ui_locales: "es-MX es" },
          cacheLocation: "memory",
          useRefreshTokens: false,
        });
        authRef.current = client;

        const params = new URLSearchParams(window.location.search);
        if (params.has("code") && params.has("state")) {
          const callback = await client.handleRedirectCallback<{ returnTo?: string }>();
          if (callback.appState?.returnTo === "/admin") {
            window.location.replace("/admin");
            return;
          }
          window.history.replaceState({}, document.title, "/portal");
        } else {
          await client.checkSession();
        }

        const authenticated = await client.isAuthenticated();
        if (!active) return;
        if (authenticated) {
          setUser(await client.getUser());
          const accessToken = await client.getTokenSilently();
          tokenRef.current = accessToken;
          // Load the private workspace through one server request. This avoids
          // repeating Auth0 validation for summary, files, history and notices.
          const bootstrapResponse = await fetchProtected("/api/portal/bootstrap", accessToken);
          if (!bootstrapResponse.ok) throw new Error("No fue posible cargar el espacio privado.");
          const bootstrap = (await bootstrapResponse.json()) as PortalBootstrap;
          setPortalData(bootstrap.summary);
          setDocuments(bootstrap.documents.documents);
          setMessages(bootstrap.messages.messages);
          setHistory(bootstrap.history.periods);
          setAccountingPeriodId(bootstrap.history.periods[0]?.id || "");
          setState("authenticated");
        } else {
          setState("anonymous");
        }
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "No fue posible validar la sesión.");
        setState("error");
      }
    }

    void initializeAuth().finally(() => window.clearTimeout(watchdog));
    return () => { active = false; window.clearTimeout(watchdog); };
  }, []);

  useEffect(() => {
    if (state !== "authenticated") return;
    let active = true;
    async function refreshMessages() {
      if (!tokenRef.current) return;
      const response = await fetchProtected("/api/portal/messages", tokenRef.current);
      if (active && response.ok) setMessages(((await response.json()) as { messages: PortalMessage[] }).messages);
    }
    const interval = window.setInterval(() => void refreshMessages(), 60_000);
    const onFocus = () => void refreshMessages();
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, [state]);

  async function signIn() {
    setState("loading");
    try {
      await authRef.current?.loginWithRedirect({
        authorizationParams: {
          redirect_uri: `${window.location.origin}/portal`,
          connection,
          ui_locales: "es-MX es",
        },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible iniciar sesión.");
      setState("error");
    }
  }

  async function signOut() {
    await authRef.current?.logout({
      logoutParams: { returnTo: window.location.origin },
    });
  }

  async function downloadDocument(item: PortalDocument) {
    setDocumentMessage("");
    const response = await fetch(`/api/documents/${encodeURIComponent(item.id)}/download`, { headers: { authorization: `Bearer ${tokenRef.current}` } });
    if (!response.ok) { setDocumentMessage("No fue posible descargar el documento. Intente nuevamente."); return; }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a"); link.href = url; link.download = item.title; link.click(); URL.revokeObjectURL(url);
  }
  async function markMessageRead(item: PortalMessage) { if (item.readAt) return; const response = await fetch("/api/portal/messages", { method: "PATCH", headers: { authorization: `Bearer ${tokenRef.current}`, "content-type": "application/json" }, body: JSON.stringify({ id: item.id }) }); if (response.ok) setMessages((rows) => rows.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)); }

  if (state === "loading") {
    return <main className="auth-screen"><div className="auth-loader"><i/><span>Validando acceso seguro</span></div></main>;
  }

  if (state === "error") {
    return <main className="auth-screen"><section className="auth-card"><Brand/><p className="auth-kicker">ACCESO NO COMPLETADO</p><h1>No pudimos validar la sesión.</h1><p className="auth-copy">{error}</p><button className="auth-primary" onClick={() => { setError(""); setState("anonymous"); }}>Intentar nuevamente</button><a className="auth-back" href="/">← Volver al sitio</a></section></main>;
  }

  if (state === "anonymous") {
    return <main className="auth-screen">
      <div className="auth-grid" aria-hidden="true"/>
      <section className="auth-card">
        <Brand/>
        <p className="auth-kicker">PORTAL PRIVADO DE CLIENTES</p>
        <h1>Información ejecutiva, <em>bajo control.</em></h1>
        <p className="auth-copy">Ingrese con el RFC y la contraseña proporcionada por Vision Advisors. El registro público está deshabilitado.</p>
        <div className="auth-points"><span><i/>Acceso administrado por el despacho</span><span><i/>Sesión cifrada y protegida</span><span><i/>Información exclusiva de cada cliente</span></div>
        <button className="auth-primary" onClick={signIn}>Ingresar al portal <b>↗</b></button>
        <a className="auth-back" href="/">← Volver al sitio público</a>
      </section>
      <aside className="auth-visual"><div className="auth-radar"><span>V</span><small>ADVISORS</small><i/><i/><i/></div><div className="auth-note"><small>ACCESO</small><b>Fiscal · Contable · Corporativo</b></div></aside>
    </main>;
  }

  const displayName = user?.name || user?.nickname || user?.email || "Cliente";
  const unreadMessageCount = messages.filter((item) => !item.readAt).length;
  const isReady = portalData?.status === "ready" && portalData.snapshot;
  const portalMessage = portalData?.message || "El despacho está validando la asignación segura de su expediente.";
  const companyName = portalData?.organization?.tradeName || portalData?.organization?.legalName;
  const displayedResult = isReady ? portalData.snapshot!.incomeMonthCents - portalData.snapshot!.deductionsMonthCents : 0;
  const taxTotal = portalData?.taxes?.reduce((total, tax) => total + tax.amountCents, 0) || 0;
  const accountingPeriod = history.find((period) => period.id === accountingPeriodId) || history[0];
  const accountingPeriodIndex = accountingPeriod ? history.findIndex((period) => period.id === accountingPeriod.id) : -1;
  const previousAccountingPeriod = accountingPeriodIndex >= 0 ? history[accountingPeriodIndex + 1] : undefined;
  const accountingResult = (accountingPeriod?.snapshot?.incomeMonthCents || 0) - (accountingPeriod?.snapshot?.deductionsMonthCents || 0);
  const accountingTaxTotal = accountingPeriod?.taxes?.reduce((total, tax) => total + tax.amountCents, 0) || 0;
  const accountingDocuments = accountingPeriod ? documents.filter((item) => item.periodYear === accountingPeriod.year && item.periodMonth === accountingPeriod.month && ["tax", "accounting", "report"].includes(item.category)) : [];
  const vatDue = Math.max(0, (accountingPeriod?.snapshot?.vatTransferredCents || 0) - (accountingPeriod?.snapshot?.vatCreditableCents || 0) - (accountingPeriod?.snapshot?.vatWithheldCents || 0));
  const publishedVat = accountingPeriod?.taxes?.find((tax) => tax.taxType.toUpperCase() === "IVA");
  const resultReconciled = !accountingPeriod?.snapshot || accountingPeriod.snapshot.estimatedResultCents === accountingResult;
  const vatReconciled = !publishedVat || publishedVat.amountCents === vatDue;
  const declarationDeadline = deadlineMeta(accountingPeriod?.snapshot?.paymentDueDate, accountingPeriod?.snapshot?.filingStatus);
  const currentCsf = documents.find((item) => item.fiscalType === "csf" && item.isCurrent);
  const currentOpinion = documents.find((item) => item.fiscalType === "opinion" && item.isCurrent);
  const opinionExpired = Boolean(currentOpinion?.validUntil && new Date(`${currentOpinion.validUntil}T23:59:59Z`).getTime() < Date.now());
  const opinionNegative = currentOpinion?.opinionSense === "negative";
  const fiscalStatusTitle = opinionNegative ? "Requiere atención" : opinionExpired ? "Opinión vencida" : isReady ? "Tu información fiscal está publicada" : "Acceso habilitado de forma segura";
  const fiscalStatusCopy = opinionNegative ? "La opinión publicada contiene pendientes. Su asesor le indicará las acciones necesarias." : opinionExpired ? "El despacho está gestionando la renovación de su opinión de cumplimiento." : isReady ? `Periodo revisado por el despacho · ${monthName(portalData.period?.month)} ${portalData.period?.year}` : "Vision Advisors notificará al cliente cuando su primer análisis mensual esté disponible.";
  return <main className="secure-shell">
    <aside className={`secure-sidebar${menuOpen ? " open" : ""}`}><Brand/><nav><span>PORTAL DEL CLIENTE</span><a className="active" href="#resumen" onClick={() => setMenuOpen(false)}>Resumen</a><a href="#fiscal" onClick={() => setMenuOpen(false)}>Fiscal y contable</a><a href="#documentos" onClick={() => setMenuOpen(false)}>Documentos fiscales</a><a href="#mensajes" onClick={() => setMenuOpen(false)}>Mensajes {messages.some((item) => !item.readAt) ? `(${messages.filter((item) => !item.readAt).length})` : ""}</a><a href="#historial" onClick={() => setMenuOpen(false)}>Historial</a><span>CUENTA</span><a className="disabled" aria-disabled="true">Mi cuenta · Próximamente</a></nav><button onClick={signOut}>Cerrar sesión</button></aside>
    <section className="secure-workspace">
      <header><button className="portal-menu" type="button" aria-label="Abrir menú" onClick={() => setMenuOpen((value) => !value)}>☰</button><p>Portal Vision / <b>Resumen</b></p><a className="notification-bell" href="#mensajes" aria-label={`${unreadMessageCount} mensajes nuevos`} title="Mensajes del despacho"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{unreadMessageCount > 0 && <span>{unreadMessageCount}</span>}</a><div><small>SESIÓN PROTEGIDA</small><b>{companyName || displayName}</b></div><span>{displayName.slice(0, 2).toUpperCase()}</span></header>
      <div className="secure-content" id="resumen"><p className="auth-kicker">{isReady ? `PERIODO ${monthName(portalData.period?.month).toUpperCase()} ${portalData.period?.year}` : "PORTAL VISION"}</p><h1>{companyName ? `Hola, ${companyName}` : "Bienvenido a su espacio privado."}</h1><p>{isReady ? alignPeriodSummary(portalData.snapshot?.executiveSummary || "", portalData.period?.year, portalData.period?.month) : portalMessage}</p><article className={`secure-notice${opinionNegative ? " bad" : opinionExpired ? " warn" : ""}`}><i>{opinionNegative ? "!" : opinionExpired ? "⌛" : "✓"}</i><div><h2>{fiscalStatusTitle}</h2><p>{fiscalStatusCopy}</p></div></article><section className="secure-status"><div><small>INGRESOS FACTURADOS</small><b>{isReady ? formatMoney(portalData.snapshot!.incomeMonthCents) : "—"}</b><span>Información del periodo publicado</span></div><div><small>GASTOS DEDUCIBLES</small><b>{isReady ? formatMoney(portalData.snapshot!.deductionsMonthCents) : "—"}</b><span>Comprobantes revisados</span></div><div><small>UTILIDAD ESTIMADA</small><b>{isReady ? formatMoney(displayedResult) : "—"}</b><span>{isReady && portalData.snapshot!.incomeMonthCents ? `Margen ${((displayedResult / portalData.snapshot!.incomeMonthCents) * 100).toFixed(1)}%` : "Pendiente"}</span></div><div className="highlight"><small>IMPUESTOS ESTIMADOS</small><b>{isReady ? formatMoney(taxTotal) : "—"}</b><span>ISR, IVA y contribuciones</span></div></section>{!isReady && <a className="demo-link" href="/portal-demo">Ver demostración con datos ficticios →</a>}
        <section className="portal-accounting" id="fiscal"><div className="accounting-heading"><div><p className="auth-kicker">FISCAL Y CONTABLE</p><h2>Mi contabilidad</h2><span>Consulte las cifras, contribuciones y documentos publicados por el despacho.</span></div><label>Periodo contable<select value={accountingPeriod?.id || ""} onChange={(event) => setAccountingPeriodId(event.target.value)} disabled={!history.length}>{history.map((period) => <option key={period.id} value={period.id}>{monthName(period.month)} {period.year}</option>)}</select></label></div>{accountingPeriod?.snapshot ? <><div className="accounting-kpis"><article><small>INGRESOS DEL MES</small><b>{formatMoney(accountingPeriod.snapshot.incomeMonthCents)}</b><span>{variationLabel(accountingPeriod.snapshot.incomeMonthCents, previousAccountingPeriod?.snapshot?.incomeMonthCents)}</span></article><article><small>GASTOS DEDUCIBLES</small><b>{formatMoney(accountingPeriod.snapshot.deductionsMonthCents)}</b><span className="expense-variation">{variationLabel(accountingPeriod.snapshot.deductionsMonthCents, previousAccountingPeriod?.snapshot?.deductionsMonthCents)}</span></article><article><small>UTILIDAD CALCULADA</small><b>{formatMoney(accountingResult)}</b><span>Ingresos menos gastos deducibles</span></article><article className="highlight"><small>CONTRIBUCIONES ESTIMADAS</small><b>{formatMoney(accountingTaxTotal)}</b><span>{filingStatusLabel(accountingPeriod.snapshot.filingStatus)}</span></article></div><div className="accounting-grid"><article className="tax-breakdown"><div><small>DESGLOSE DEL PERIODO</small><h3>Impuestos y contribuciones</h3></div>{accountingPeriod.taxes?.map((tax) => <div className="tax-row" key={tax.taxType}><span><b>{tax.taxType}</b><small>{taxStatus(tax.status)}{tax.dueDate ? ` · vence ${formatShortDate(tax.dueDate)}` : ""}</small></span><strong>{formatMoney(tax.amountCents)}</strong></div>)}{!accountingPeriod.taxes?.length && <p>El despacho todavía no ha publicado un desglose de contribuciones para este periodo.</p>}<div className="tax-total"><span>Total estimado</span><b>{formatMoney(accountingTaxTotal)}</b></div></article><article className="accounting-reading"><small>LECTURA EJECUTIVA</small><h3>{accountingPeriod.snapshot.healthLabel || "Información del periodo"}</h3><p>{alignPeriodSummary(accountingPeriod.snapshot.executiveSummary || "", accountingPeriod.year, accountingPeriod.month)}</p><div className="accounting-facts"><span><b>{accountingPeriod.snapshot.issuedCfdiCount || 0}</b> CFDI emitidos</span><span><b>{accountingPeriod.snapshot.receivedCfdiCount || 0}</b> CFDI recibidos</span><span><b>{accountingPeriod.snapshot.paymentDueDate ? formatShortDate(accountingPeriod.snapshot.paymentDueDate) : "Pendiente"}</b> Fecha límite</span></div>{accountingPeriod.observations.map((observation) => <div key={`${accountingPeriod.id}-${observation.title}`}><b>{observation.title}</b><span>{observation.detail}</span></div>)}</article></div><div className="accounting-files"><div><small>DECLARACIONES Y ACUSES</small><h3>Documentos del periodo</h3></div>{accountingDocuments.map((item) => <article key={item.id}><span><b>{item.title}</b><small>{documentCategory(item.category)} · {formatBytes(item.sizeBytes)}</small></span><button type="button" onClick={() => void downloadDocument(item)}>Descargar ↓</button></article>)}{!accountingDocuments.length && <p>No hay declaraciones o acuses asociados a este periodo.</p>}</div></> : <p className="accounting-empty">Todavía no hay periodos contables publicados.</p>}</section>
        {accountingPeriod?.snapshot && <AccountingReconciliation period={accountingPeriod} result={accountingResult} resultReconciled={resultReconciled} vatDue={vatDue} vatReconciled={vatReconciled} deadline={declarationDeadline}/>}
        <section className="portal-documents" id="documentos"><div><p className="auth-kicker">EXPEDIENTE DIGITAL</p><h2>Documentos fiscales</h2><span>Archivos publicados de forma segura por Vision Advisors.</span></div><div className="fiscal-document-cards"><FiscalDocumentCard label="Constancia de Situación Fiscal" document={currentCsf} onDownload={downloadDocument}/><FiscalDocumentCard label="Opinión de cumplimiento" document={currentOpinion} onDownload={downloadDocument}/></div><h3 className="other-documents-title">Otros documentos</h3><div className="portal-document-list">{documents.filter((item) => !item.isCurrent || !["csf", "opinion"].includes(item.fiscalType)).map((item) => <article key={item.id}><div><b>{item.title}</b><small>{fiscalTypeLabel(item.fiscalType)}{item.issueDate ? ` · emitido ${formatShortDate(item.issueDate)}` : ""}{!item.isCurrent ? " · Anterior" : ""} · {formatBytes(item.sizeBytes)}</small></div><button type="button" onClick={() => void downloadDocument(item)}>Descargar ↓</button></article>)}{!documents.length && <p>Aún no hay documentos publicados para su expediente.</p>}</div>{documentMessage && <p className="portal-document-error">{documentMessage}</p>}</section>
        <section className="portal-messages" id="mensajes"><div><p className="auth-kicker">COMUNICACIÓN</p><h2>Mensajes del despacho</h2><span>Avisos y acciones relacionados con su expediente.</span></div><div className="message-list">{messages.map((item) => { const attachment = documents.find((document) => document.id === item.documentId); return <article key={item.id} className={`${item.type}${item.readAt ? " read" : ""}`} onClick={() => void markMessageRead(item)}><div><small>{item.type === "urgent" ? "URGENTE" : item.type === "action" ? "ACCIÓN REQUERIDA" : "INFORMATIVO"}</small><h3>{item.subject}</h3><p>{item.body}</p>{item.dueDate && <b>Fecha límite: {formatShortDate(item.dueDate)}</b>}{attachment && <button type="button" onClick={(event) => { event.stopPropagation(); void downloadDocument(attachment); }}>Descargar documento adjunto ↓</button>}</div><span>{item.readAt ? "Leído" : "Nuevo"}</span></article>; })}{!messages.length && <p>No tiene mensajes pendientes.</p>}</div><a className="whatsapp-link" href="https://wa.me/529612320183?text=Hola%20Vision%20Advisors%2C%20necesito%20apoyo%20con%20mi%20portal" target="_blank" rel="noreferrer">Contactar al despacho por WhatsApp ↗</a></section>
        <section className="portal-history" id="historial"><div><p className="auth-kicker">MEMORIA FINANCIERA</p><h2>Historial mensual</h2><span>Consulte los periodos que el despacho ha revisado y publicado.</span></div><div className="portal-history-list">{history.map((period, index) => <details key={period.id} open={index === 0}><summary><div><b>{monthName(period.month)} {period.year}</b><small>{period.publishedAt ? publicationLabel(period.publishedAt, period.year, period.month) : "Periodo publicado"}</small></div><span>{period.snapshot?.healthLabel || "Información disponible"}</span></summary><div className="portal-history-detail"><div><small>INGRESOS DEL MES</small><b>{formatMoney(period.snapshot?.incomeMonthCents || 0)}</b></div><div><small>DEDUCCIONES DEL MES</small><b>{formatMoney(period.snapshot?.deductionsMonthCents || 0)}</b></div><div><small>RESULTADO DEL MES</small><b>{formatMoney((period.snapshot?.incomeMonthCents || 0) - (period.snapshot?.deductionsMonthCents || 0))}</b></div><div><small>DOCUMENTOS DISPONIBLES</small><b>{period.documentCount + period.generalDocumentCount}</b></div>{period.snapshot?.executiveSummary && <p>{alignPeriodSummary(period.snapshot.executiveSummary, period.year, period.month)}</p>}{period.observations.map((observation) => <p key={`${period.id}-${observation.title}`}><strong>{observation.title}:</strong> {observation.detail}</p>)}</div></details>)}{!history.length && <p>Aún no hay periodos publicados en el historial.</p>}</div></section>
      </div>
    </section>
  </main>;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}
function documentCategory(category: string) { return ({ report: "Reporte", tax: "Fiscal", accounting: "Contable", legal: "Legal", other: "Otro" } as Record<string, string>)[category] || "Documento"; }
function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function formatShortDate(date: string) { return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(date)); }
function taxStatus(status: string) { return ({ estimated: "Estimado", determined: "Determinado", filed: "Presentado", paid: "Pagado" } as Record<string, string>)[status] || "Estimado"; }
function fiscalTypeLabel(type: string) { return ({ csf: "Constancia fiscal", opinion: "Opinión de cumplimiento", acuse: "Acuse o declaración", general: "Documento" } as Record<string, string>)[type] || "Documento"; }
function opinionLabel(sense?: string | null) { return ({ positive: "Positiva", negative: "Negativa", no_obligations: "Sin obligaciones", registered_no_obligations: "Inscrito sin obligaciones" } as Record<string, string>)[sense || ""] || "Sin sentido registrado"; }
function filingStatusLabel(status?: string) { return ({ determined: "Declaración determinada", filed: "Declaración presentada", paid: "Declaración pagada" } as Record<string, string>)[status || ""] || "Determinación disponible"; }
function variationLabel(current: number, previous?: number) { if (!previous) return "Sin comparativo anterior"; const variation = ((current - previous) / previous) * 100; return `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}% contra el periodo anterior`; }
function monthName(month?: number) { return month ? new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, month - 1, 1))).replace(/^./, (letter) => letter.toUpperCase()) : ""; }
function formatDate(date: string) { return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(date)); }
function publicationLabel(date: string, year: number, month: number) { const published = new Date(date); const periodStart = new Date(Date.UTC(year, month - 1, 1)); return published < periodStart ? `Publicación anticipada registrada el ${formatDate(date)}` : `Publicado el ${formatDate(date)}`; }
function alignPeriodSummary(summary: string, year?: number, month?: number) { if (!year || !month) return summary; return summary.replace(/\b(periodo\s+)(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(\s+de)?\s+\d{4}\b/gi, (_match, prefix: string) => `${prefix}${monthName(month).toLowerCase()} ${year}`); }

type DeadlineMeta = { tone: "paid" | "overdue" | "soon" | "current" | "pending"; label: string };
function deadlineMeta(date?: string | null, status?: string): DeadlineMeta {
  if (status === "paid") return { tone: "paid", label: "Obligación pagada" };
  if (!date) return { tone: "pending", label: "Fecha pendiente" };
  const due = new Date(`${date.slice(0, 10)}T23:59:59Z`).getTime();
  const remainingDays = Math.ceil((due - Date.now()) / 86_400_000);
  if (remainingDays < 0) return { tone: "overdue", label: `Vencida hace ${Math.abs(remainingDays)} día${remainingDays === -1 ? "" : "s"}` };
  if (remainingDays <= 7) return { tone: "soon", label: remainingDays === 0 ? "Vence hoy" : `Vence en ${remainingDays} días` };
  return { tone: "current", label: `Quedan ${remainingDays} días` };
}

function AccountingReconciliation({ period, result, resultReconciled, vatDue, vatReconciled, deadline }: { period: HistoryPeriod; result: number; resultReconciled: boolean; vatDue: number; vatReconciled: boolean; deadline: DeadlineMeta }) {
  const snapshot = period.snapshot!;
  const ivaPublished = period.taxes.find((tax) => tax.taxType.toUpperCase() === "IVA");
  return <section className="accounting-reconciliation" aria-label="Conciliación fiscal del periodo">
    <div className={`accounting-declaration ${deadline.tone}`}>
      <div><small>ESTADO DE LA DECLARACIÓN</small><b>{filingStatusLabel(snapshot.filingStatus)}</b></div>
      <div><small>FECHA LÍMITE</small><b>{snapshot.paymentDueDate ? formatShortDate(snapshot.paymentDueDate) : "Pendiente de definir"}</b></div>
      <span>{deadline.label}</span>
    </div>
    <div className="reconciliation-heading"><div><small>CONCILIACIÓN AUTOMÁTICA</small><h3>Comprobación de cifras</h3></div><span className={resultReconciled && vatReconciled ? "ok" : "warn"}>{resultReconciled && vatReconciled ? "✓ Cifras conciliadas" : "! Revisión requerida"}</span></div>
    <div className="vat-reconciliation">
      <article><small>IVA TRASLADADO</small><b>{formatMoney(snapshot.vatTransferredCents || 0)}</b></article>
      <i>−</i><article><small>IVA ACREDITABLE</small><b>{formatMoney(snapshot.vatCreditableCents || 0)}</b></article>
      <i>−</i><article><small>IVA RETENIDO</small><b>{formatMoney(snapshot.vatWithheldCents || 0)}</b></article>
      <i>=</i><article className="result"><small>IVA A CARGO</small><b>{formatMoney(vatDue)}</b></article>
    </div>
    <div className="reconciliation-notes">
      <p className={resultReconciled ? "ok" : "warn"}><b>{resultReconciled ? "✓ Resultado conciliado" : "! Diferencia en resultado"}</b><span>Ingresos menos deducciones: {formatMoney(result)}{!resultReconciled ? ` · publicado: ${formatMoney(snapshot.estimatedResultCents)}` : ""}</span></p>
      <p className={vatReconciled ? "ok" : "warn"}><b>{vatReconciled ? "✓ IVA conciliado" : "! Diferencia en IVA"}</b><span>IVA calculado: {formatMoney(vatDue)}{ivaPublished ? ` · publicado: ${formatMoney(ivaPublished.amountCents)}` : ""}</span></p>
      <p><b>Acumulado del ejercicio</b><span>Ingresos {formatMoney(snapshot.incomeYtdCents || 0)} · deducciones {formatMoney(snapshot.deductionsYtdCents || 0)}</span></p>
    </div>
  </section>;
}

function Brand() {
  return <a className="auth-brand" href="/" aria-label="Vision Advisors"><img src="/brand/vision-advisors-logo.png" alt="Vision Advisors"/><span>VISION ADVISORS LATAM</span></a>;
}

function FiscalDocumentCard({ label, document, onDownload }: { label: string; document?: PortalDocument; onDownload: (item: PortalDocument) => Promise<void> }) {
  const expired = Boolean(document?.validUntil && new Date(`${document.validUntil}T23:59:59Z`).getTime() < Date.now());
  const negative = document?.opinionSense === "negative";
  return <article className={`fiscal-document-card${negative ? " bad" : expired ? " expired" : ""}`}><small>{label.toUpperCase()}</small>{document ? <><div><h3>{document.title}</h3><span>{document.fiscalType === "opinion" ? opinionLabel(document.opinionSense) : "Vigente"}</span></div><p>{document.issueDate ? `Emitido el ${formatShortDate(document.issueDate)}` : "Fecha de emisión no registrada"}{document.validUntil ? ` · Vigente hasta ${formatShortDate(document.validUntil)}` : ""}</p>{negative && <p className="fiscal-warning">Requiere atención. Consulte con su asesor el pendiente señalado en la opinión.</p>}<button type="button" onClick={() => void onDownload(document)}>Descargar documento ↓</button></> : <><h3>Pendiente de publicación</h3><p>El despacho todavía no ha publicado este documento.</p></>}</article>;
}
