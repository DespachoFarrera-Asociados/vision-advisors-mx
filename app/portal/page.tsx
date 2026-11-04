"use client";

import { Auth0Client, type User } from "@auth0/auth0-spa-js";
import { useEffect, useRef, useState } from "react";
import "./portal-auth.css";

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
    deductionsMonthCents: number;
    estimatedResultCents: number;
    executiveSummary: string;
  } | null;
};
type PortalDocument = { id: string; title: string; category: string; mimeType: string; sizeBytes: number; periodYear: number | null; periodMonth: number | null; publishedAt: string | null };
type HistoryPeriod = { id: string; year: number; month: number; publishedAt: string | null; snapshot: PortalData["snapshot"]; observations: { title: string; detail: string }[]; documentCount: number };

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

  useEffect(() => {
    let active = true;

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
          // Auth0 can throttle simultaneous /userinfo validations for the same
          // token. Load each protected resource in sequence so all three APIs
          // resolve the same portal identity reliably.
          const portalResponse = await fetch("/api/portal/summary", { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
          if (portalResponse.ok || portalResponse.status === 503) {
            setPortalData((await portalResponse.json()) as PortalData);
          }
          const documentResponse = await fetch("/api/portal/documents", { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
          if (documentResponse.ok) setDocuments(((await documentResponse.json()) as { documents: PortalDocument[] }).documents);
          const historyResponse = await fetch("/api/portal/history", { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
          if (historyResponse.ok) setHistory(((await historyResponse.json()) as { periods: HistoryPeriod[] }).periods);
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

    void initializeAuth();
    return () => { active = false; };
  }, []);

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
  const isReady = portalData?.status === "ready" && portalData.snapshot;
  const portalMessage = portalData?.message || "El despacho está validando la asignación segura de su expediente.";
  const companyName = portalData?.organization?.tradeName || portalData?.organization?.legalName;
  return <main className="secure-shell">
    <aside className="secure-sidebar"><Brand/><nav><a className="active" href="#resumen">Resumen</a><a href="#fiscal">Fiscal y contable</a><a href="#documentos">Documentos</a><a href="#historial">Historial</a></nav><button onClick={signOut}>Cerrar sesión</button></aside>
    <section className="secure-workspace">
      <header><div><small>SESIÓN PROTEGIDA</small><b>{displayName}</b></div><span>{displayName.slice(0, 2).toUpperCase()}</span></header>
      <div className="secure-content" id="resumen"><p className="auth-kicker">PORTAL VISION</p><h1>{companyName ? `Información de ${companyName}.` : "Bienvenido a su espacio privado."}</h1><p>{isReady ? portalData.snapshot?.executiveSummary : portalMessage}</p><section className="secure-status"><div><small>ESTADO DE ACCESO</small><b>Cuenta activa</b><span>Autenticación completada</span></div><div><small>{isReady ? "INGRESOS DEL MES" : "EXPEDIENTE"}</small><b>{isReady ? formatMoney(portalData.snapshot!.incomeMonthCents) : "En preparación"}</b><span>{isReady ? "Información del periodo publicado" : "Sin información financiera publicada"}</span></div><div><small>{isReady ? "RESULTADO ESTIMADO" : "PRÓXIMO PASO"}</small><b>{isReady ? formatMoney(portalData.snapshot!.estimatedResultCents) : "Asignación del despacho"}</b><span>{isReady ? `${monthName(portalData.period?.month)} ${portalData.period?.year}` : "Validación interna de permisos"}</span></div></section><article className="secure-notice" id="fiscal"><i>✓</i><div><h2>{isReady ? "Información mensual publicada" : "Acceso habilitado de forma segura"}</h2><p>{isReady ? `Deducciones del mes: ${formatMoney(portalData.snapshot!.deductionsMonthCents)}.` : "Vision Advisors notificará al cliente cuando su primer análisis mensual esté disponible."}</p></div></article>{!isReady && <a className="demo-link" href="/portal-demo">Ver demostración con datos ficticios →</a>}
        <section className="portal-documents" id="documentos"><div><p className="auth-kicker">EXPEDIENTE DIGITAL</p><h2>Documentos disponibles</h2><span>Archivos publicados de forma segura por Vision Advisors.</span></div><div className="portal-document-list">{documents.map((item) => <article key={item.id}><div><b>{item.title}</b><small>{documentCategory(item.category)}{item.periodMonth ? ` · ${item.periodMonth}/${item.periodYear}` : ""} · {formatBytes(item.sizeBytes)}</small></div><button type="button" onClick={() => void downloadDocument(item)}>Descargar ↓</button></article>)}{!documents.length && <p>Aún no hay documentos publicados para su expediente.</p>}</div>{documentMessage && <p className="portal-document-error">{documentMessage}</p>}</section>
        <section className="portal-history" id="historial"><div><p className="auth-kicker">MEMORIA FINANCIERA</p><h2>Historial mensual</h2><span>Consulte los periodos que el despacho ha revisado y publicado.</span></div><div className="portal-history-list">{history.map((period, index) => <details key={period.id} open={index === 0}><summary><div><b>{monthName(period.month)} {period.year}</b><small>{period.publishedAt ? `Publicado el ${formatDate(period.publishedAt)}` : "Periodo publicado"}</small></div><span>{period.snapshot?.healthLabel || "Información disponible"}</span></summary><div className="portal-history-detail"><div><small>INGRESOS DEL MES</small><b>{formatMoney(period.snapshot?.incomeMonthCents || 0)}</b></div><div><small>DEDUCCIONES DEL MES</small><b>{formatMoney(period.snapshot?.deductionsMonthCents || 0)}</b></div><div><small>RESULTADO ESTIMADO</small><b>{formatMoney(period.snapshot?.estimatedResultCents || 0)}</b></div><div><small>DOCUMENTOS ASOCIADOS</small><b>{period.documentCount}</b></div>{period.snapshot?.executiveSummary && <p>{period.snapshot.executiveSummary}</p>}{period.observations.map((observation) => <p key={`${period.id}-${observation.title}`}><strong>{observation.title}:</strong> {observation.detail}</p>)}</div></details>)}{!history.length && <p>Aún no hay periodos publicados en el historial.</p>}</div></section>
      </div>
    </section>
  </main>;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}
function documentCategory(category: string) { return ({ report: "Reporte", tax: "Fiscal", accounting: "Contable", legal: "Legal", other: "Otro" } as Record<string, string>)[category] || "Documento"; }
function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function monthName(month?: number) { return month ? new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, month - 1, 1))).replace(/^./, (letter) => letter.toUpperCase()) : ""; }
function formatDate(date: string) { return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(date)); }

function Brand() {
  return <a className="auth-brand" href="/" aria-label="Vision Advisors"><img src="/brand/vision-advisors-logo.png" alt="Vision Advisors"/><span>VISION ADVISORS LATAM</span></a>;
}
