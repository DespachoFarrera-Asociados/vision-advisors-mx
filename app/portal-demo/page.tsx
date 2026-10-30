"use client";

import { useState } from "react";
import "./portal.css";

const periods = ["Mar 2026", "Abr 2026", "May 2026", "Jun 2026"];

const activity = [
  ["Cierre mensual", "Completado", "28 jun 2026"],
  ["Declaraciones provisionales", "Presentadas", "17 jun 2026"],
  ["Reporte ejecutivo", "Disponible", "30 jun 2026"],
  ["Revisión de controles", "En seguimiento", "Próxima sesión"],
];

const documents = [
  ["Reporte integral · Junio 2026", "PDF · 2.4 MB", "30 JUN"],
  ["Resumen de impuestos", "PDF · 860 KB", "18 JUN"],
  ["Análisis ingresos y deducciones", "XLSX · 1.1 MB", "28 JUN"],
];

export default function PortalDemo() {
  const [period, setPeriod] = useState(periods[3]);
  const [menu, setMenu] = useState(false);

  return <main className="portal-shell">
    <aside className={`portal-sidebar ${menu ? "portal-sidebar-open" : ""}`}>
      <div className="portal-brand"><img src="/brand/vision-advisors-logo.png" alt="Vision Advisors"/><span>PORTAL CLIENTE</span></div>
      <button className="portal-close" onClick={() => setMenu(false)} aria-label="Cerrar menú">×</button>
      <nav>
        <a className="selected" href="#resumen"><i>⌂</i><span>Resumen</span></a>
        <a href="#fiscal"><i>◫</i><span>Fiscal y contable</span></a>
        <a href="#indicadores"><i>⌁</i><span>Indicadores</span></a>
        <a href="#documentos"><i>□</i><span>Documentos</span></a>
        <a href="#actividad"><i>↻</i><span>Historial</span></a>
      </nav>
      <div className="portal-help"><small>¿NECESITA APOYO?</small><p>Su asesor está disponible para revisar cualquier indicador.</p><a href="https://wa.me/529612320183" target="_blank" rel="noreferrer">Contactar asesor ↗</a></div>
      <a className="portal-back" href="/">← Volver al sitio público</a>
    </aside>

    <section className="portal-workspace">
      <header className="portal-topbar">
        <button className="portal-menu" onClick={() => setMenu(true)} aria-label="Abrir menú">☰</button>
        <div className="demo-badge"><i/> DEMOSTRACIÓN · DATOS FICTICIOS</div>
        <div className="client-switch"><div><small>EMPRESA</small><b>Grupo Empresarial Demo, S.A. de C.V.</b></div><span>GE</span></div>
      </header>

      <div className="portal-content" id="resumen">
        <div className="portal-heading">
          <div><p>VISIÓN MENSUAL</p><h1>Buenos días, <em>Carlos.</em></h1><span>Este es el panorama ejecutivo de su empresa.</span></div>
          <label>Periodo analizado<select value={period} onChange={(e) => setPeriod(e.target.value)}>{periods.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>

        <section className="executive-status">
          <div className="status-score"><div className="score-ring"><strong>82</strong><span>/100</span></div><div><small>SALUD EMPRESARIAL</small><h2>Operación estable</h2><p>Los indicadores principales se mantienen dentro del rango esperado. Hay dos oportunidades de mejora.</p></div></div>
          <div className="status-signals"><div><i className="green"/><span>Cumplimiento</span><b>Al corriente</b></div><div><i className="yellow"/><span>Atención</span><b>2 observaciones</b></div><div><i className="green"/><span>Cierre</span><b>Completado</b></div></div>
        </section>

        <section className="metric-grid" id="fiscal">
          <article><div className="metric-top"><span>INGRESOS ACUMULADOS</span><i>↗</i></div><strong>$4,280,500</strong><p><b>+8.4%</b> contra el periodo anterior</p><div className="mini-bars"><i style={{height:"35%"}}/><i style={{height:"48%"}}/><i style={{height:"43%"}}/><i style={{height:"61%"}}/><i style={{height:"72%"}}/><i className="current" style={{height:"82%"}}/></div></article>
          <article><div className="metric-top"><span>DEDUCCIONES ACUMULADAS</span><i>↘</i></div><strong>$2,915,800</strong><p><b>68.1%</b> proporción sobre ingresos</p><div className="deduction-track"><i style={{width:"68.1%"}}/></div><small>Objetivo de control: 65% – 72%</small></article>
          <article className="tax-card"><div className="metric-top"><span>IMPUESTOS DEL MES</span><i>◎</i></div><strong>$186,420</strong><p>Estimación consolidada</p><div className="tax-split"><span><i style={{width:"62%"}}/>ISR <b>$115,580</b></span><span><i style={{width:"38%"}}/>IVA <b>$70,840</b></span></div></article>
          <article className="accent-metric"><div className="metric-top"><span>RESULTADO ESTIMADO</span><i>↗</i></div><strong>$1,178,280</strong><p>Resultado antes de impuestos</p><div className="result-note"><i/> Margen estimado <b>27.5%</b></div></article>
        </section>

        <section className="portal-panels" id="indicadores">
          <article className="trend-panel">
            <div className="panel-head"><div><small>COMPORTAMIENTO</small><h2>Ingresos vs. deducciones</h2></div><div className="legend"><span><i/>Ingresos</span><span><i/>Deducciones</span></div></div>
            <div className="chart-area"><div className="chart-lines"><i/><i/><i/><i/></div><svg viewBox="0 0 700 230" preserveAspectRatio="none" aria-label="Gráfica demostrativa"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff200" stopOpacity=".35"/><stop offset="1" stopColor="#fff200" stopOpacity="0"/></linearGradient></defs><path className="area" d="M0,188 C70,170 80,150 140,158 S235,125 280,132 S370,75 420,96 S510,60 560,68 S650,38 700,48 L700,230 L0,230Z"/><path className="income" d="M0,188 C70,170 80,150 140,158 S235,125 280,132 S370,75 420,96 S510,60 560,68 S650,38 700,48"/><path className="expense" d="M0,205 C65,196 90,184 140,189 S230,163 280,172 S370,138 420,151 S510,127 560,132 S650,105 700,113"/></svg><div className="chart-labels"><span>ENE</span><span>FEB</span><span>MAR</span><span>ABR</span><span>MAY</span><span>JUN</span></div></div>
          </article>

          <article className="observations-panel"><div className="panel-head"><div><small>ATENCIÓN EJECUTIVA</small><h2>Observaciones</h2></div><span className="count-badge">2</span></div><div className="observation yellow-ob"><i>!</i><div><b>Documentación pendiente</b><p>Dos comprobantes requieren soporte complementario antes del próximo cierre.</p><a href="#documentos">Revisar detalle →</a></div></div><div className="observation green-ob"><i>✓</i><div><b>Control fortalecido</b><p>La conciliación bancaria se completó sin diferencias materiales.</p></div></div></article>
        </section>

        <section className="lower-grid">
          <article className="documents-panel" id="documentos"><div className="panel-head"><div><small>BIBLIOTECA</small><h2>Documentos recientes</h2></div><button>Ver todos →</button></div>{documents.map((doc) => <div className="document-row" key={doc[0]}><i>PDF</i><div><b>{doc[0]}</b><span>{doc[1]}</span></div><small>{doc[2]}</small><button aria-label={`Descargar ${doc[0]}`}>↓</button></div>)}</article>
          <article className="activity-panel" id="actividad"><div className="panel-head"><div><small>SEGUIMIENTO</small><h2>Actividad del periodo</h2></div></div>{activity.map((item, index) => <div className="activity-row" key={item[0]}><i className={index === 3 ? "pending" : "done"}/><div><b>{item[0]}</b><span>{item[1]}</span></div><small>{item[2]}</small></div>)}</article>
        </section>

        <footer className="portal-footer"><span>Prototipo confidencial · Vision Advisors Latam</span><span>Los valores mostrados son ficticios y únicamente ilustrativos.</span></footer>
      </div>
    </section>
  </main>;
}
