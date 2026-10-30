"use client";

import { Auth0Client, type User } from "@auth0/auth0-spa-js";
import { useEffect, useRef, useState } from "react";
import "./portal-auth.css";

const auth0Domain = "visionadvisorslatam.us.auth0.com";
const auth0ClientId = "2ugfLDMQWdghmyfw9Ml0g0UG4uVBRC7Y";
const connection = "clientes-vision-advisors";

type PortalState = "loading" | "anonymous" | "authenticated" | "error";

export default function ClientPortal() {
  const authRef = useRef<Auth0Client | null>(null);
  const [state, setState] = useState<PortalState>("loading");
  const [user, setUser] = useState<User | undefined>();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      try {
        const redirectUri = `${window.location.origin}/portal`;
        const client = new Auth0Client({
          domain: auth0Domain,
          clientId: auth0ClientId,
          authorizationParams: { redirect_uri: redirectUri },
          cacheLocation: "memory",
          useRefreshTokens: false,
        });
        authRef.current = client;

        const params = new URLSearchParams(window.location.search);
        if (params.has("code") && params.has("state")) {
          await client.handleRedirectCallback();
          window.history.replaceState({}, document.title, "/portal");
        } else {
          await client.checkSession();
        }

        const authenticated = await client.isAuthenticated();
        if (!active) return;
        if (authenticated) {
          setUser(await client.getUser());
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
  return <main className="secure-shell">
    <aside className="secure-sidebar"><Brand/><nav><a className="active" href="#resumen">Resumen</a><a href="#proximamente">Fiscal y contable</a><a href="#proximamente">Documentos</a><a href="#proximamente">Historial</a></nav><button onClick={signOut}>Cerrar sesión</button></aside>
    <section className="secure-workspace">
      <header><div><small>SESIÓN PROTEGIDA</small><b>{displayName}</b></div><span>{displayName.slice(0, 2).toUpperCase()}</span></header>
      <div className="secure-content" id="resumen"><p className="auth-kicker">PORTAL VISION</p><h1>Bienvenido a su espacio privado.</h1><p>Su acceso fue validado correctamente. La información fiscal y financiera se habilitará cuando el despacho concluya la asignación segura de su expediente.</p><section className="secure-status"><div><small>ESTADO DE ACCESO</small><b>Cuenta activa</b><span>Autenticación completada</span></div><div><small>EXPEDIENTE</small><b>En preparación</b><span>Sin información financiera publicada</span></div><div><small>PRÓXIMO PASO</small><b>Asignación del despacho</b><span>Validación interna de permisos</span></div></section><article className="secure-notice" id="proximamente"><i>✓</i><div><h2>Acceso habilitado de forma segura</h2><p>Este portal todavía no contiene datos fiscales reales. Vision Advisors notificará al cliente cuando su primer análisis mensual esté disponible.</p></div></article><a className="demo-link" href="/portal-demo">Ver demostración con datos ficticios →</a></div>
    </section>
  </main>;
}

function Brand() {
  return <a className="auth-brand" href="/" aria-label="Vision Advisors"><img src="/brand/vision-advisors-logo.png" alt="Vision Advisors"/><span>VISION ADVISORS LATAM</span></a>;
}
