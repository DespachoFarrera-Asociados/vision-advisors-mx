"use client";

import { Auth0Client, type User } from "@auth0/auth0-spa-js";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import "./admin.css";

const auth0Domain = "visionadvisorslatam.us.auth0.com";
const auth0ClientId = "2ugfLDMQWdghmyfw9Ml0g0UG4uVBRC7Y";
const connection = "clientes-vision-advisors";

type Organization = {
  id: string;
  legalName: string;
  tradeName: string;
  status: string;
  members: number;
  periods: number;
};

type Screen = "loading" | "anonymous" | "forbidden" | "ready" | "error";

export default function AdminPortal() {
  const authRef = useRef<Auth0Client | null>(null);
  const tokenRef = useRef("");
  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<User>();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState("");

  const loadOrganizations = useCallback(async (token: string) => {
    const response = await fetch("/api/admin/organizations", {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (response.status === 403) {
      setScreen("forbidden");
      return;
    }
    if (!response.ok) throw new Error("No fue posible consultar las empresas.");
    const data = (await response.json()) as { organizations: Organization[] };
    setOrganizations(data.organizations);
    setSelectedOrganization((current) => current || data.organizations[0]?.id || "");
    setScreen("ready");
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
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
        await client.checkSession();
        if (!active) return;
        if (!(await client.isAuthenticated())) {
          setScreen("anonymous");
          return;
        }
        setUser(await client.getUser());
        const token = await client.getTokenSilently();
        tokenRef.current = token;
        await loadOrganizations(token);
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "No fue posible iniciar el panel.");
        setScreen("error");
      }
    }
    void initialize();
    return () => { active = false; };
  }, [loadOrganizations]);

  async function signIn() {
    await authRef.current?.loginWithRedirect({
      authorizationParams: {
        redirect_uri: `${window.location.origin}/portal`,
        connection,
        ui_locales: "es-MX es",
      },
      appState: { returnTo: "/admin" },
    });
  }

  async function signOut() {
    await authRef.current?.logout({ logoutParams: { returnTo: window.location.origin } });
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/organizations", {
      method: "POST",
      headers: { authorization: `Bearer ${tokenRef.current}`, "content-type": "application/json" },
      body: JSON.stringify({ legalName: form.get("legalName"), tradeName: form.get("tradeName") }),
    });
    const data = (await response.json()) as { message?: string };
    if (!response.ok) setMessage(data.message || "No fue posible crear la empresa.");
    else {
      event.currentTarget.reset();
      setMessage("Empresa registrada correctamente.");
      await loadOrganizations(tokenRef.current);
    }
    setBusy(false);
  }

  async function createPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/periods", {
      method: "POST",
      headers: { authorization: `Bearer ${tokenRef.current}`, "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: form.get("organizationId"),
        year: Number(form.get("year")),
        month: Number(form.get("month")),
      }),
    });
    const data = (await response.json()) as { message?: string };
    if (!response.ok) setMessage(data.message || "No fue posible abrir el periodo.");
    else {
      setMessage("Periodo mensual creado como borrador.");
      await loadOrganizations(tokenRef.current);
    }
    setBusy(false);
  }

  if (screen === "loading") return <main className="admin-gate"><span className="admin-spinner"/>Validando permisos del despacho…</main>;
  if (screen === "anonymous") return <Gate title="Panel del despacho" copy="Inicie sesión con una cuenta autorizada de Vision Advisors." action="Ingresar" onAction={signIn}/>;
  if (screen === "forbidden") return <Gate title="Acceso restringido" copy="Su sesión es válida, pero esta cuenta no tiene permisos administrativos." action="Cerrar sesión" onAction={signOut}/>;
  if (screen === "error") return <Gate title="Panel no disponible" copy={message} action="Volver al sitio" href="/"/>;

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Brand/>
      <p>CONTROL INTERNO</p>
      <nav><a className="active" href="#empresas">Empresas</a><a href="#periodos">Periodos mensuales</a><span>Clientes · próxima etapa</span><span>Documentos · próxima etapa</span></nav>
      <button onClick={signOut}>Cerrar sesión</button>
    </aside>
    <section className="admin-workspace">
      <header><div><small>SESIÓN DEL DESPACHO</small><b>{user?.email}</b></div><span>{(user?.email || "VA").slice(0, 2).toUpperCase()}</span></header>
      <div className="admin-content">
        <p className="admin-kicker">VISION ADVISORS · ADMINISTRACIÓN</p>
        <h1>Expedientes bajo control.</h1>
        <p className="admin-lead">Registre empresas y prepare sus periodos mensuales. Nada será visible para el cliente hasta que el despacho lo publique.</p>
        {message && <div className="admin-message" role="status">{message}</div>}

        <section className="admin-grid" id="empresas">
          <article className="admin-panel admin-list">
            <div className="admin-panel-title"><div><small>DIRECTORIO</small><h2>Empresas registradas</h2></div><strong>{organizations.length}</strong></div>
            <div className="admin-table">
              {organizations.map((organization) => <div className="admin-row" key={organization.id}>
                <span><b>{organization.tradeName}</b><small>{organization.legalName}</small></span>
                <span><small>CLIENTES</small><b>{organization.members}</b></span>
                <span><small>PERIODOS</small><b>{organization.periods}</b></span>
                <i>{organization.status === "active" ? "Activa" : organization.status}</i>
              </div>)}
              {!organizations.length && <p className="admin-empty">Todavía no hay empresas registradas.</p>}
            </div>
          </article>

          <form className="admin-panel admin-form" onSubmit={createOrganization}>
            <small>NUEVO EXPEDIENTE</small><h2>Registrar empresa</h2>
            <label>Nombre comercial<input name="tradeName" required maxLength={120} placeholder="Ej. Clínica del Sureste"/></label>
            <label>Razón social<input name="legalName" required maxLength={180} placeholder="Nombre legal completo"/></label>
            <p>El RFC y las credenciales se incorporarán en la etapa segura de asignación del cliente.</p>
            <button disabled={busy}>{busy ? "Procesando…" : "Crear expediente"}</button>
          </form>
        </section>

        <section className="admin-period" id="periodos">
          <div><small>CIERRE MENSUAL</small><h2>Abrir un periodo de trabajo</h2><p>Se crea como borrador interno. El cliente no podrá consultarlo hasta su publicación.</p></div>
          <form onSubmit={createPeriod}>
            <label>Empresa<select name="organizationId" value={selectedOrganization} onChange={(event) => setSelectedOrganization(event.target.value)} required><option value="">Seleccione…</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.tradeName}</option>)}</select></label>
            <label>Mes<select name="month" defaultValue={new Date().getMonth() + 1}>{months.map((month, index) => <option value={index + 1} key={month}>{month}</option>)}</select></label>
            <label>Año<input name="year" type="number" min="2020" max="2100" defaultValue={new Date().getFullYear()}/></label>
            <button disabled={busy || !organizations.length}>{busy ? "Procesando…" : "Crear periodo"}</button>
          </form>
        </section>
      </div>
    </section>
  </main>;
}

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function Brand() {
  return <a className="admin-brand" href="/"><img src="/brand/vision-advisors-logo.png" alt="Vision Advisors"/><span>VISION ADVISORS LATAM</span></a>;
}

function Gate({ title, copy, action, onAction, href }: { title: string; copy: string; action: string; onAction?: () => void; href?: string }) {
  return <main className="admin-gate"><section><Brand/><p>PANEL ADMINISTRATIVO</p><h1>{title}</h1><span>{copy}</span>{href ? <a href={href}>{action}</a> : <button onClick={onAction}>{action}</button>}</section></main>;
}
