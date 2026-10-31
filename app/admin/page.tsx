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

type Period = { id: string; organizationId: string; year: number; month: number; status: "draft" | "review" | "published" | "locked"; publishedAt: string | null; updatedAt: string };
type PeriodDetail = {
  period: Period;
  snapshot: null | { healthScore: number; healthLabel: string; incomeMonthCents: number; incomeYtdCents: number; deductionsMonthCents: number; deductionsYtdCents: number; estimatedResultCents: number; executiveSummary: string };
  taxes: { taxType: string; amountCents: number }[];
  observations: { detail: string }[];
};
type Client = {
  id: string;
  email: string;
  displayName: string;
  platformRole: "client";
  status: "invited" | "active" | "suspended";
  lastAccessAt: string | null;
  organizationId: string | null;
  organizationName: string | null;
  membershipRole: "viewer" | "manager" | "advisor" | null;
};
type DocumentItem = {
  id: string; organizationId: string; organizationName: string; periodId: string | null;
  periodYear: number | null; periodMonth: number | null; title: string; category: string;
  mimeType: string; sizeBytes: number; status: "draft" | "published";
  publishedAt: string | null; createdAt: string;
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
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [periodDetail, setPeriodDetail] = useState<PeriodDetail>();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

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

  const loadPeriods = useCallback(async (organizationId: string, preferredPeriodId?: string) => {
    if (!organizationId || !tokenRef.current) { setPeriods([]); setSelectedPeriod(""); setPeriodDetail(undefined); return; }
    setPeriods([]); setSelectedPeriod(""); setPeriodDetail(undefined);
    const response = await fetch(`/api/admin/periods?organizationId=${encodeURIComponent(organizationId)}`, { headers: { authorization: `Bearer ${tokenRef.current}` }, cache: "no-store" });
    if (!response.ok) throw new Error("No fue posible consultar los periodos.");
    const data = (await response.json()) as { periods: Period[] };
    setPeriods(data.periods);
    setSelectedPeriod((current) => preferredPeriodId || (data.periods.some((period) => period.id === current) ? current : data.periods[0]?.id || ""));
  }, []);

  const loadClients = useCallback(async () => {
    if (!tokenRef.current) return;
    const response = await fetch("/api/admin/clients", { headers: { authorization: `Bearer ${tokenRef.current}` }, cache: "no-store" });
    if (!response.ok) throw new Error("No fue posible consultar los clientes.");
    const data = (await response.json()) as { clients: Client[] };
    setClients(data.clients);
    setSelectedClient((current) => current || data.clients[0]?.id || "");
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!tokenRef.current) return;
    const response = await fetch("/api/admin/documents", { headers: { authorization: `Bearer ${tokenRef.current}` }, cache: "no-store" });
    if (!response.ok) throw new Error("No fue posible consultar los documentos.");
    setDocuments(((await response.json()) as { documents: DocumentItem[] }).documents);
  }, []);

  const loadPeriodDetail = useCallback(async (periodId: string) => {
    if (!periodId || !tokenRef.current) { setPeriodDetail(undefined); return; }
    const response = await fetch(`/api/admin/periods?periodId=${encodeURIComponent(periodId)}`, { headers: { authorization: `Bearer ${tokenRef.current}` }, cache: "no-store" });
    if (!response.ok) throw new Error("No fue posible consultar el periodo.");
    setPeriodDetail((await response.json()) as PeriodDetail);
  }, []);

  useEffect(() => { if (screen === "ready") void loadPeriods(selectedOrganization).catch((error) => setMessage(error.message)); }, [loadPeriods, screen, selectedOrganization]);
  useEffect(() => { void loadPeriodDetail(selectedPeriod).catch((error) => setMessage(error.message)); }, [loadPeriodDetail, selectedPeriod]);

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
        await loadClients();
        await loadDocuments();
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "No fue posible iniciar el panel.");
        setScreen("error");
      }
    }
    void initialize();
    return () => { active = false; };
  }, [loadClients, loadDocuments, loadOrganizations]);

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const formElement = event.currentTarget;
    const response = await fetch("/api/admin/documents", { method: "POST", headers: { authorization: `Bearer ${tokenRef.current}` }, body: new FormData(formElement) });
    const data = (await response.json()) as { message?: string };
    setMessage(data.message || (response.ok ? "Documento cargado." : "No fue posible cargar el documento."));
    if (response.ok) { formElement.reset(); await loadDocuments(); }
    setBusy(false);
  }

  async function setDocumentStatus(id: string, status: "draft" | "published") {
    setBusy(true); setMessage("");
    const response = await fetch("/api/admin/documents", { method: "PATCH", headers: { authorization: `Bearer ${tokenRef.current}`, "content-type": "application/json" }, body: JSON.stringify({ id, status }) });
    const data = (await response.json()) as { message?: string };
    setMessage(data.message || "No fue posible actualizar el documento.");
    if (response.ok) await loadDocuments();
    setBusy(false);
  }

  async function deleteDocument(id: string) {
    if (!window.confirm("¿Eliminar definitivamente este documento?")) return;
    setBusy(true); setMessage("");
    const response = await fetch(`/api/admin/documents?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: { authorization: `Bearer ${tokenRef.current}` } });
    const data = (await response.json()) as { message?: string };
    setMessage(data.message || "No fue posible eliminar el documento.");
    if (response.ok) await loadDocuments();
    setBusy(false);
  }

  async function downloadDocument(id: string, title: string) {
    const response = await fetch(`/api/documents/${encodeURIComponent(id)}/download`, { headers: { authorization: `Bearer ${tokenRef.current}` } });
    if (!response.ok) { setMessage("No fue posible descargar el documento."); return; }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a"); link.href = url; link.download = title; link.click(); URL.revokeObjectURL(url);
  }

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
    const data = (await response.json()) as { id?: string; message?: string };
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
    const data = (await response.json()) as { id?: string; message?: string };
    if (!response.ok) setMessage(data.message || "No fue posible abrir el periodo.");
    else {
      setMessage("Periodo mensual creado como borrador.");
      await loadOrganizations(tokenRef.current);
      await loadPeriods(String(form.get("organizationId")), data.id);
    }
    setBusy(false);
  }

  async function savePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPeriod) return;
    setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const pesos = (name: string) => Math.round(parseMoney(String(form.get(name) || "0")) * 100);
    const response = await fetch("/api/admin/periods", {
      method: "PUT",
      headers: { authorization: `Bearer ${tokenRef.current}`, "content-type": "application/json" },
      body: JSON.stringify({
        periodId: selectedPeriod, healthScore: Number(form.get("healthScore")), healthLabel: form.get("healthLabel"),
        incomeMonthCents: pesos("incomeMonth"), incomeYtdCents: pesos("incomeYtd"), deductionsMonthCents: pesos("deductionsMonth"),
        deductionsYtdCents: pesos("deductionsYtd"), estimatedResultCents: pesos("estimatedResult"), executiveSummary: form.get("executiveSummary"),
        observation: form.get("observation"), taxes: { ISR: pesos("ISR"), IVA: pesos("IVA"), IMSS: pesos("IMSS"), INFONAVIT: pesos("INFONAVIT"), ISN: pesos("ISN") },
      }),
    });
    const data = (await response.json()) as { message?: string };
    setMessage(data.message || (response.ok ? "Información guardada para revisión." : "No fue posible guardar el periodo."));
    if (response.ok) { await loadPeriods(selectedOrganization, selectedPeriod); await loadPeriodDetail(selectedPeriod); }
    setBusy(false);
  }

  async function publishPeriod() {
    if (!selectedPeriod || !window.confirm("¿Publicar este periodo? La información será visible para los clientes vinculados a esta empresa.")) return;
    setBusy(true); setMessage("");
    const response = await fetch("/api/admin/periods", { method: "PATCH", headers: { authorization: `Bearer ${tokenRef.current}`, "content-type": "application/json" }, body: JSON.stringify({ periodId: selectedPeriod }) });
    const data = (await response.json()) as { message?: string };
    setMessage(data.message || (response.ok ? "Periodo publicado." : "No fue posible publicar el periodo."));
    if (response.ok) { await loadPeriods(selectedOrganization, selectedPeriod); await loadPeriodDetail(selectedPeriod); }
    setBusy(false);
  }

  async function updateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/clients", {
      method: "PATCH",
      headers: { authorization: `Bearer ${tokenRef.current}`, "content-type": "application/json" },
      body: JSON.stringify({ userId: form.get("userId"), organizationId: form.get("organizationId"), membershipRole: form.get("membershipRole"), status: form.get("status") }),
    });
    const data = (await response.json()) as { message?: string };
    setMessage(data.message || (response.ok ? "Cliente actualizado." : "No fue posible actualizar el cliente."));
    if (response.ok) { await loadClients(); await loadOrganizations(tokenRef.current); }
    setBusy(false);
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { authorization: `Bearer ${tokenRef.current}`, "content-type": "application/json" },
      body: JSON.stringify({ identitySubject: form.get("identitySubject"), email: form.get("email"), displayName: form.get("displayName"), organizationId: form.get("organizationId"), membershipRole: form.get("membershipRole") }),
    });
    const data = (await response.json()) as { message?: string };
    setMessage(data.message || (response.ok ? "Cliente incorporado." : "No fue posible incorporar el cliente."));
    if (response.ok) { formElement.reset(); await loadClients(); await loadOrganizations(tokenRef.current); }
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
      <nav><a className="active" href="#empresas">Empresas</a><a href="#periodos">Periodos mensuales</a><a href="#clientes">Clientes</a><a href="#documentos">Documentos</a></nav>
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

        <section className="period-editor" id="captura">
          <div className="editor-heading"><div><small>ANÁLISIS MENSUAL</small><h2>Preparar información del cliente</h2><p>Guarde primero para revisión. La publicación requiere una confirmación independiente.</p></div><div className="editor-selectors"><label>Empresa<select value={selectedOrganization} onChange={(event) => setSelectedOrganization(event.target.value)}>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.tradeName}</option>)}</select></label><label>Periodo<select value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)}><option value="">Seleccione…</option>{periods.map((period) => <option key={period.id} value={period.id}>{months[period.month - 1]} {period.year} · {statusLabel(period.status)}</option>)}</select></label></div></div>
          {!selectedPeriod && <p className="editor-empty">Abra o seleccione un periodo para comenzar la captura.</p>}
          {selectedPeriod && periodDetail && <PeriodForm key={`${periodDetail.period.id}-${periodDetail.period.updatedAt}`} detail={periodDetail} busy={busy} message={message} onSubmit={savePeriod} onPublish={publishPeriod}/>}
        </section>

        <section className="client-admin" id="clientes">
          <div className="client-heading"><div><small>ACCESOS Y VINCULACIONES</small><h2>Clientes del portal</h2><p>Asigne cada usuario a una sola empresa y controle su acceso. Las contraseñas permanecen exclusivamente en Auth0.</p></div><strong>{clients.length}</strong></div>
          <ClientOnboardingForm organizations={organizations} busy={busy} onSubmit={createClient}/>
          <div className="client-layout">
            <div className="client-list">
              {clients.map((client) => <button type="button" className={selectedClient === client.id ? "selected" : ""} key={client.id} onClick={() => setSelectedClient(client.id)}>
                <span><b>{client.displayName || client.email}</b><small>{client.email}</small></span>
                <span><small>{client.organizationName || "Sin empresa"}</small><i className={`client-status status-${client.status}`}>{client.status === "active" ? "Activo" : client.status === "suspended" ? "Suspendido" : "Invitado"}</i></span>
              </button>)}
              {!clients.length && <p className="admin-empty">Todavía no hay usuarios cliente sincronizados con el portal.</p>}
            </div>
            {selectedClient && <ClientAssignmentForm
              key={`${selectedClient}-${clients.find((client) => client.id === selectedClient)?.organizationId}`}
              client={clients.find((client) => client.id === selectedClient)!}
              organizations={organizations}
              busy={busy}
              onSubmit={updateClient}
            />}
          </div>
        </section>

        <section className="document-admin" id="documentos">
          <div className="document-heading"><div><small>ARCHIVO PRIVADO</small><h2>Documentos del portal</h2><p>Cargue archivos al expediente. El cliente sólo podrá descargarlos después de su publicación.</p></div><strong>{documents.length}</strong></div>
          <form className="document-upload" onSubmit={uploadDocument}>
            <label>Título<input name="title" required maxLength={180} placeholder="Ej. Cédula fiscal de octubre"/></label>
            <label>Empresa<select name="organizationId" required value={selectedOrganization} onChange={(event) => setSelectedOrganization(event.target.value)}><option value="">Seleccione…</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.tradeName}</option>)}</select></label>
            <label>Periodo opcional<select name="periodId" defaultValue=""><option value="">Sin periodo</option>{periods.map((period) => <option key={period.id} value={period.id}>{months[period.month - 1]} {period.year}</option>)}</select></label>
            <label>Categoría<select name="category" defaultValue="report"><option value="report">Reporte</option><option value="tax">Fiscal</option><option value="accounting">Contable</option><option value="legal">Legal</option><option value="other">Otro</option></select></label>
            <label className="document-file">Archivo<input name="file" type="file" required accept=".pdf,.xlsx,.docx,.csv"/></label>
            <button disabled={busy}>{busy ? "Procesando…" : "Cargar borrador"}</button>
          </form>
          <div className="document-list">
            {documents.map((item) => <article key={item.id}><div><b>{item.title}</b><small>{item.organizationName}{item.periodMonth ? ` · ${months[item.periodMonth - 1]} ${item.periodYear}` : " · Sin periodo"}</small><span>{documentCategory(item.category)} · {formatBytes(item.sizeBytes)}</span></div><i className={`document-status ${item.status}`}>{item.status === "published" ? "Publicado" : "Borrador"}</i><div className="document-actions"><button type="button" onClick={() => void downloadDocument(item.id, item.title)}>Descargar</button><button type="button" disabled={busy} onClick={() => void setDocumentStatus(item.id, item.status === "published" ? "draft" : "published")}>{item.status === "published" ? "Retirar" : "Publicar"}</button><button className="danger" type="button" disabled={busy} onClick={() => void deleteDocument(item.id)}>Eliminar</button></div></article>)}
            {!documents.length && <p className="admin-empty">Todavía no hay documentos cargados.</p>}
          </div>
        </section>
      </div>
    </section>
  </main>;
}

function ClientOnboardingForm({ organizations, busy, onSubmit }: { organizations: Organization[]; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <details className="client-onboarding">
    <summary>Incorporar una cuenta existente de Auth0</summary>
    <form onSubmit={onSubmit}>
      <p>Cree primero el usuario y su contraseña en Auth0. Después copie aquí su ID de usuario para vincularlo con un expediente.</p>
      <label>RFC / nombre de usuario<input name="displayName" required placeholder="Ej. ABC010203AB1" autoComplete="off"/></label>
      <label>Correo electrónico<input name="email" type="email" required placeholder="cliente@empresa.com" autoComplete="off"/></label>
      <label>ID de usuario de Auth0<input name="identitySubject" required placeholder="auth0|..." autoComplete="off"/></label>
      <label>Empresa<select name="organizationId" required defaultValue=""><option value="">Seleccione…</option>{organizations.filter((organization) => organization.status !== "archived").map((organization) => <option key={organization.id} value={organization.id}>{organization.tradeName}</option>)}</select></label>
      <label>Permiso<select name="membershipRole" defaultValue="viewer"><option value="viewer">Consulta</option><option value="manager">Responsable de la empresa</option></select></label>
      <button disabled={busy}>{busy ? "Incorporando…" : "Incorporar cliente"}</button>
    </form>
  </details>;
}

function ClientAssignmentForm({ client, organizations, busy, onSubmit }: { client: Client; organizations: Organization[]; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="client-form" onSubmit={onSubmit}>
    <input type="hidden" name="userId" value={client.id}/>
    <small>EDITAR ACCESO</small><h3>{client.displayName || "Cliente"}</h3><p>{client.email}</p>
    <label>Empresa vinculada<select name="organizationId" required defaultValue={client.organizationId || ""}><option value="">Seleccione…</option>{organizations.filter((organization) => organization.status !== "archived").map((organization) => <option key={organization.id} value={organization.id}>{organization.tradeName}</option>)}</select></label>
    <label>Permiso dentro de la empresa<select name="membershipRole" defaultValue={client.membershipRole === "manager" ? "manager" : "viewer"}><option value="viewer">Consulta</option><option value="manager">Responsable de la empresa</option></select></label>
    <label>Estado de acceso<select name="status" defaultValue={client.status === "suspended" ? "suspended" : "active"}><option value="active">Activo</option><option value="suspended">Suspendido</option></select></label>
    <p className="client-note">Para crear la cuenta o cambiar su contraseña utilice Auth0. Este panel únicamente controla qué expediente puede consultar.</p>
    <button disabled={busy}>{busy ? "Guardando…" : "Guardar vinculación"}</button>
  </form>;
}

function PeriodForm({ detail, busy, message, onSubmit, onPublish }: { detail: PeriodDetail; busy: boolean; message: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onPublish: () => void }) {
  const snapshot = detail.snapshot;
  const amount = (cents?: number) => cents ? (cents / 100).toFixed(2) : "0.00";
  const tax = (type: string) => amount(detail.taxes.find((item) => item.taxType === type)?.amountCents);
  const locked = detail.period.status === "locked";
  return <form className="editor-form" onSubmit={onSubmit}>
    <div className="editor-status"><span className={`status-${detail.period.status}`}>{statusLabel(detail.period.status)}</span>{detail.period.publishedAt && <small>Publicado: {new Date(detail.period.publishedAt).toLocaleString("es-MX")}</small>}</div>
    <fieldset disabled={busy || locked}><legend>Indicador ejecutivo</legend><div className="field-grid two"><label>Salud financiera (0 a 100)<input name="healthScore" type="number" min="0" max="100" required defaultValue={snapshot?.healthScore ?? 70}/></label><label>Evaluación<input name="healthLabel" required maxLength={80} defaultValue={snapshot?.healthLabel ?? "Estable con áreas de atención"}/></label></div></fieldset>
    <fieldset disabled={busy || locked}><legend>Información contable · MXN</legend><div className="field-grid"><Money name="incomeMonth" label="Ingresos del mes" value={amount(snapshot?.incomeMonthCents)}/><Money name="incomeYtd" label="Ingresos acumulados" value={amount(snapshot?.incomeYtdCents)}/><Money name="deductionsMonth" label="Deducciones del mes" value={amount(snapshot?.deductionsMonthCents)}/><Money name="deductionsYtd" label="Deducciones acumuladas" value={amount(snapshot?.deductionsYtdCents)}/><Money name="estimatedResult" label="Resultado estimado" value={amount(snapshot?.estimatedResultCents)} signed/></div></fieldset>
    <fieldset disabled={busy || locked}><legend>Impuestos y contribuciones estimados · MXN</legend><div className="field-grid five">{["ISR","IVA","IMSS","INFONAVIT","ISN"].map((type) => <Money key={type} name={type} label={type} value={tax(type)}/>)}</div></fieldset>
    <fieldset disabled={busy || locked}><legend>Lectura ejecutiva</legend><label>Resumen para el cliente<textarea name="executiveSummary" required maxLength={1800} defaultValue={snapshot?.executiveSummary ?? ""} placeholder="Explique los resultados del periodo de forma clara y accionable."/></label><label>Observación o acción sugerida<textarea name="observation" maxLength={1600} defaultValue={detail.observations[0]?.detail ?? ""} placeholder="Señale riesgos, pendientes o recomendaciones específicas."/></label></fieldset>
    <div className="editor-actions"><button type="submit" disabled={busy || locked}>{busy ? "Procesando…" : "Guardar para revisión"}</button><button className="publish" type="button" disabled={busy || locked || !snapshot || detail.period.status !== "review"} onClick={onPublish}>Publicar al cliente</button></div>
    {message && <div className="editor-feedback" role="status">{message}</div>}
  </form>;
}

function Money({ name, label, value, signed = false }: { name: string; label: string; value: string; signed?: boolean }) {
  const [displayValue, setDisplayValue] = useState(() => formatMoney(value));

  function normalize() {
    const parsed = parseMoney(displayValue);
    setDisplayValue(formatMoney(signed ? parsed : Math.max(0, parsed)));
  }

  return <label>{label}<span className="money-input"><span aria-hidden="true">$</span><input
    name={name}
    type="text"
    inputMode="decimal"
    required
    value={displayValue}
    onChange={(event) => setDisplayValue(event.target.value)}
    onBlur={normalize}
    aria-label={`${label} en pesos mexicanos`}
  /></span></label>;
}

function parseMoney(value: string) {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseMoney(String(value)));
}
function statusLabel(status: Period["status"]) { return ({ draft: "Borrador", review: "En revisión", published: "Publicado", locked: "Bloqueado" })[status]; }
function documentCategory(category: string) { return ({ report: "Reporte", tax: "Fiscal", accounting: "Contable", legal: "Legal", other: "Otro" } as Record<string, string>)[category] || "Documento"; }
function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function Brand() {
  return <a className="admin-brand" href="/"><img src="/brand/vision-advisors-logo.png" alt="Vision Advisors"/><span>VISION ADVISORS LATAM</span></a>;
}

function Gate({ title, copy, action, onAction, href }: { title: string; copy: string; action: string; onAction?: () => void; href?: string }) {
  return <main className="admin-gate"><section><Brand/><p>PANEL ADMINISTRATIVO</p><h1>{title}</h1><span>{copy}</span>{href ? <a href={href}>{action}</a> : <button onClick={onAction}>{action}</button>}</section></main>;
}
