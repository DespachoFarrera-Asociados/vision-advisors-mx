"use client";

import { useEffect } from "react";
import "./portal/portal-auth.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Portal bootstrap error", error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main className="auth-screen">
          <section className="auth-card">
            <p className="auth-kicker">CONEXIÓN INTERRUMPIDA</p>
            <h1>El portal no terminó de cargar.</h1>
            <p className="auth-copy">Su información permanece protegida. Puede reintentar sin cerrar su sesión.</p>
            <button className="auth-primary" type="button" onClick={reset}>Reintentar</button>
            <a className="auth-back" href="/">← Volver al sitio</a>
          </section>
        </main>
      </body>
    </html>
  );
}
