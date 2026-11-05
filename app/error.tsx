"use client";

import { useEffect } from "react";
import "./portal/portal-auth.css";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Application render error", error);
  }, [error]);

  return <main className="auth-screen"><section className="auth-card"><p className="auth-kicker">CONEXIÓN INTERRUMPIDA</p><h1>El contenido no terminó de cargar.</h1><p className="auth-copy">Puede reintentar de forma segura.</p><button className="auth-primary" type="button" onClick={reset}>Reintentar</button><a className="auth-back" href="/">← Volver al sitio</a></section></main>;
}
