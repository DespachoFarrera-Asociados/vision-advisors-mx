"use client";

import { useEffect, useRef, useState } from "react";

type WindowContent = {
  eyebrow: string;
  title: string;
  intro: string;
  body: string[];
  meta?: string;
  action?: string;
};

const services = [
  { n: "01", title: "Estrategia fiscal", text: "Planeación, cumplimiento y defensa preventiva para tomar decisiones con certeza, sin improvisaciones.", tags: ["Impuestos", "SAT", "Prevención"] },
  { n: "02", title: "Contabilidad inteligente", text: "Información financiera clara, cierres oportunos y tableros que convierten los números en decisiones.", tags: ["NIF", "Reportes", "Control"] },
  { n: "03", title: "Auditoría & riesgos", text: "Revisión independiente de procesos, controles y obligaciones para detectar contingencias antes de que escalen.", tags: ["Diagnóstico", "Control interno", "Dictámenes"] },
  { n: "04", title: "Derecho corporativo", text: "Constitución, actas, contratos, gobierno corporativo y acompañamiento legal para empresas en movimiento.", tags: ["Sociedades", "Contratos", "Compliance"] },
  { n: "05", title: "Nómina & seguridad social", text: "Cálculo, timbrado y cumplimiento patronal con trazabilidad, confidencialidad y atención puntual.", tags: ["IMSS", "INFONAVIT", "Laboral"] },
  { n: "06", title: "Consultoría empresarial", text: "Estructuras, indicadores y procesos diseñados para ordenar la operación y sostener el crecimiento.", tags: ["KPIs", "Procesos", "Crecimiento"] },
];

const steps = [
  ["01", "Escuchamos", "Entendemos el momento, los objetivos y los riesgos reales de tu empresa."],
  ["02", "Diagnosticamos", "Revisamos información contable, fiscal y corporativa con una visión integral."],
  ["03", "Diseñamos", "Trazamos una ruta priorizada, clara y viable; sin soluciones genéricas."],
  ["04", "Acompañamos", "Ejecutamos, medimos y permanecemos cerca de cada decisión importante."],
];

const highlights: Array<WindowContent & { kind: string; date: string }> = [
  {
    kind: "Actualidad fiscal",
    date: "Actualización periódica",
    eyebrow: "Criterio para decidir",
    title: "Alertas fiscales explicadas con claridad",
    intro: "Un espacio editorial para entender cambios, fechas y criterios relevantes sin ruido técnico innecesario.",
    body: [
      "Publicaremos análisis preparados por Vision Advisors sobre obligaciones, resoluciones y temas que puedan afectar la operación de las empresas.",
      "Cada nota identificará su fecha, autor, fuentes consultadas y alcance informativo. El contenido no sustituirá una revisión particular de cada caso.",
    ],
    meta: "Fiscal · Contable · Nómina · Corporativo",
  },
  {
    kind: "Proyecto especializado",
    date: "Transformación empresarial",
    eyebrow: "Tecnología con propósito",
    title: "Desarrollo web alineado con la operación",
    intro: "Diseñamos presencia digital y herramientas web pensadas para procesos reales, no sólo para verse bien.",
    body: [
      "Acompañamos a empresas que necesitan presentar mejor sus servicios, ordenar solicitudes y convertir su sitio en un punto de contacto útil.",
      "El proyecto puede integrar diagnóstico, arquitectura de información, diseño, publicación y acompañamiento posterior.",
    ],
    meta: "Estrategia · Diseño · Implementación",
  },
  {
    kind: "Auditoría preventiva",
    date: "Control y anticipación",
    eyebrow: "Antes de que el riesgo escale",
    title: "Revisión interna con enfoque ejecutivo",
    intro: "Detectamos desviaciones, vacíos de control y contingencias para convertir hallazgos en acciones priorizadas.",
    body: [
      "La revisión considera procesos, documentación, obligaciones, responsabilidades y trazabilidad de la información.",
      "El resultado se presenta en un reporte ejecutivo con nivel de riesgo, responsables sugeridos y ruta de atención.",
    ],
    meta: "Diagnóstico · Riesgos · Plan de acción",
  },
  {
    kind: "Beneficio BNI",
    date: "Promoción vigente",
    eyebrow: "Excellence Tuxtla",
    title: "Condiciones especiales para miembros BNI",
    intro: "Una conversación inicial para identificar necesidades y definir el alcance más conveniente para cada empresa.",
    body: [
      "Los miembros activos de BNI pueden solicitar promociones y condiciones preferentes en servicios seleccionados.",
      "La disponibilidad y alcance se confirman directamente según el servicio, complejidad y calendario de atención.",
    ],
    meta: "Beneficio sujeto a valoración",
    action: "Solicitar información",
  },
];

export default function Home() {
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState(0);
  const [windowContent, setWindowContent] = useState<WindowContent | null>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reveal = new IntersectionObserver((items) => items.forEach((i) => i.isIntersecting && i.target.classList.add("is-visible")), { threshold: .12 });
    document.querySelectorAll(".reveal").forEach((el) => reveal.observe(el));
    const move = (e: PointerEvent) => {
      document.documentElement.style.setProperty("--cursor-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${e.clientY}px`);
      if (!heroRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const x = (e.clientX / innerWidth - .5) * 18;
      const y = (e.clientY / innerHeight - .5) * 18;
      heroRef.current.style.setProperty("--mx", `${x}px`);
      heroRef.current.style.setProperty("--my", `${y}px`);
    };
    addEventListener("pointermove", move);
    return () => { reveal.disconnect(); removeEventListener("pointermove", move); };
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setWindowContent(null);
    document.body.style.overflow = windowContent ? "hidden" : "";
    addEventListener("keydown", close);
    return () => { document.body.style.overflow = ""; removeEventListener("keydown", close); };
  }, [windowContent]);

  return <main>
    <div className="grain" aria-hidden="true" />
    <div className="custom-cursor" aria-hidden="true"><i /></div>
    <nav className="nav glass">
      <a className="brand" href="#inicio" aria-label="Vision Advisors, inicio">
        <img src="/brand/vision-advisors-logo.png" alt="Vision Advisors" />
      </a>
      <div className={`navlinks ${menu ? "open" : ""}`}>
        <a href="#firma" onClick={() => setMenu(false)}>La firma</a>
        <a href="#servicios" onClick={() => setMenu(false)}>Servicios</a>
        <a href="#actualidad" onClick={() => setMenu(false)}>Actualidad</a>
        <a href="#proyectos" onClick={() => setMenu(false)}>Proyectos</a>
        <a href="#socio" onClick={() => setMenu(false)}>Quiénes somos</a>
        <button className="portal-link" onClick={() => { setMenu(false); setWindowContent({ eyebrow: "Portal Vision", title: "Un espacio privado para cada cliente", intro: "Aquí podrá consultar el resumen mensual, indicadores, reportes y documentos preparados por el despacho.", body: ["El portal se encuentra en su fase de arquitectura y seguridad. Su acceso se habilitará únicamente cuando la autenticación, los permisos y la protección de datos hayan sido validados.", "Ninguna información fiscal o financiera real se almacenará durante esta primera fase pública."], meta: "Próximamente · Acceso seguro" }); }}>Iniciar sesión <span>↗</span></button>
      </div>
      <button className="menu" onClick={() => setMenu(!menu)} aria-label="Abrir menú" aria-expanded={menu}><i/><i/></button>
    </nav>

    <section className="hero" id="inicio" ref={heroRef}>
      <div className="orb orb-a"/><div className="orb orb-b"/>
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-copy">
        <p className="eyebrow"><span/> Vision Advisors Latam</p>
        <h1>Claridad para<br/>decidir. <em>Visión</em><br/>para crecer.</h1>
        <p className="hero-lead">Integramos estrategia financiera, cumplimiento fiscal y derecho corporativo para convertir la complejidad de tu empresa en una ventaja.</p>
        <div className="hero-actions">
          <a href="#contacto" className="button primary">Hablemos de tu empresa <span>↗</span></a>
          <a href="#servicios" className="text-link">Explorar soluciones <span>↓</span></a>
        </div>
      </div>
      <div className="hero-radar" aria-hidden="true">
        <div className="radar-grid" />
        <div className="radar-ring rr1"/><div className="radar-ring rr2"/><div className="radar-ring rr3"/>
        <div className="radar-axis axis-x"/><div className="radar-axis axis-y"/>
        <div className="radar-sweep" />
        <i className="radar-blip blip-a"/><i className="radar-blip blip-b"/><i className="radar-blip blip-c"/><i className="radar-blip blip-d"/>
        <div className="radar-core"><b>V</b><span>ADVISORS</span><small>VISIÓN 360°</small></div>
        <div className="radar-readout readout-a"><small>RIESGO</small><strong>Preventivo</strong><i/></div>
        <div className="radar-readout readout-b"><small>COBERTURA</small><strong>Fiscal + Legal</strong><i/></div>
      </div>
      <div className="scroll-cue"><span>DESLIZA</span><i/></div>
    </section>

    <section className="manifest reveal" id="firma">
      <p className="section-kicker">Una firma, una visión completa</p>
      <div className="manifest-grid">
        <h2>Tu patrimonio merece<br/>más que <em>respuestas.</em></h2>
        <div>
          <p>No sólo atendemos obligaciones. Leemos el panorama completo para anticipar riesgos, ordenar la operación y acompañar decisiones que construyen valor.</p>
          <p>Somos el punto de encuentro entre los números, la regulación y la estrategia empresarial.</p>
          <a href="#metodo" className="line-link">Conoce nuestra forma de trabajar <span>→</span></a>
        </div>
      </div>
      <div className="principles">
        <div><b>01</b><span>Criterio<br/>estratégico</span></div>
        <div><b>02</b><span>Atención<br/>personal</span></div>
        <div><b>03</b><span>Visión<br/>integral</span></div>
        <div><b>04</b><span>Confidencialidad<br/>absoluta</span></div>
      </div>
      <div className="experience-strip reveal">
        <div><strong>+13</strong><span>años de experiencia</span></div>
        <p>Experiencia multidisciplinaria en contabilidad, impuestos, defensa fiscal y derecho corporativo para empresas que buscan estructura, prevención y crecimiento.</p>
        <div className="sector-pills"><span>Restaurantes</span><span>Constructoras</span><span>Sector médico</span></div>
      </div>
      <div className="business-fit reveal">
        <article><span>PARA QUIÉN TRABAJAMOS</span><h3>Empresas y personas que necesitan avanzar con orden.</h3><p>Emprendedores próximos a iniciar operaciones, empresarios, organizaciones en crecimiento y personas que requieren acompañamiento en su declaración anual.</p></article>
        <article><span>SOLUCIÓN PRINCIPAL</span><h3>Contabilidad e impuestos bajo una misma estrategia.</h3><p>Procesamiento contable, información financiera y gestión integral de obligaciones fiscales con seguimiento cercano y enfoque preventivo.</p></article>
      </div>
    </section>

    <section className="bni reveal" aria-label="BNI Excellence Tuxtla">
      <div className="bni-mark"><span>BNI</span><i>EXCELLENCE</i></div>
      <div className="bni-copy"><p className="section-kicker">Conexiones que generan valor</p><h2>Miembro de BNI<br/><em>Excellence Tuxtla</em></h2></div>
      <div className="bni-benefit"><span>BENEFICIO EXCLUSIVO</span><p>Promociones y condiciones especiales para miembros activos de BNI.</p><small>Sujetas al alcance y características de cada servicio.</small></div>
    </section>

    <section className="services" id="servicios">
      <div className="section-head reveal">
        <div><p className="section-kicker">Capacidades</p><h2>Soluciones que<br/><em>brindamos</em></h2></div>
        <p>Especialistas coordinados bajo una misma estrategia para que cada área de tu negocio avance en la misma dirección.</p>
      </div>
      <div className="service-list">
        {services.map((s, i) => <article key={s.n} className={`service-card ${active === i ? "active" : ""}`} onMouseEnter={() => setActive(i)} tabIndex={0} role="button" onFocus={() => setActive(i)} onClick={() => setWindowContent({ eyebrow: `Solución ${s.n}`, title: s.title, intro: s.text, body: ["Partimos de un diagnóstico para comprender el contexto, los riesgos y el objetivo empresarial antes de proponer una ruta de trabajo.", "El alcance, calendario y entregables se definen de forma transparente según las necesidades de cada organización."], meta: s.tags.join(" · "), action: "Solicitar diagnóstico" })} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}>
          <span className="service-num">{s.n}</span>
          <div className="service-main"><h3>{s.title}</h3><p>{s.text}</p><div className="tags">{s.tags.map(t => <span key={t}>{t}</span>)}</div></div>
          <span className="service-arrow">↗</span>
        </article>)}
      </div>
    </section>

    <section className="insights" id="actualidad">
      <div className="insights-intro reveal">
        <p className="section-kicker">Centro de perspectiva</p>
        <h2>Información que abre<br/><em>nuevas ventanas.</em></h2>
        <p>Actualidad, proyectos y beneficios presentados en una navegación editorial más clara. Selecciona una tarjeta para explorarla sin perder tu lugar.</p>
      </div>
      <div className="window-grid" id="proyectos">
        {highlights.map((item, index) => <button className={`window-card window-card-${index + 1} reveal`} key={item.title} onClick={() => setWindowContent(item)}>
          <span className="window-index">0{index + 1}</span>
          <div className="window-top"><span>{item.kind}</span><i>↗</i></div>
          <div className="window-copy"><small>{item.date}</small><h3>{item.title}</h3><p>{item.intro}</p></div>
          <div className="window-meta"><span>{item.meta}</span><b>Abrir ventana</b></div>
        </button>)}
      </div>
    </section>

    <section className="training">
      <div className="training-intro reveal"><p className="section-kicker">Formación empresarial</p><h2>Conocimiento que<br/><em>fortalece decisiones.</em></h2><p>Capacitaciones prácticas para equipos directivos, administrativos y operativos, diseñadas según el contexto y las necesidades de cada organización.</p></div>
      <div className="training-topics reveal">
        {[
          ["01", "Contabilidad", "Lectura financiera, registros, cierres y control para una administración más confiable."],
          ["02", "Fiscal", "Obligaciones, actualización tributaria y prevención de contingencias."],
          ["03", "Nómina", "Cálculo, timbrado, seguridad social y mejores prácticas patronales."],
          ["04", "Derecho corporativo", "Sociedades, contratos, actas, gobierno y cumplimiento empresarial."],
          ["05", "Defensa fiscal", "Facultades de comprobación, medios de defensa y atención preventiva."],
        ].map((item) => <article key={item[0]}><span>{item[0]}</span><div><h3>{item[1]}</h3><p>{item[2]}</p></div></article>)}
      </div>
    </section>

    <section className="statement reveal">
      <div className="statement-photo" />
      <div className="statement-overlay" />
      <div className="statement-copy"><p className="section-kicker light">Estrategia con Vision</p><h2>Nos preocupamos por<br/>tu patrimonio.<br/><em>Tú, por crecer.</em></h2><p>Decisiones respaldadas por datos, experiencia y una lectura multidisciplinaria del entorno.</p></div>
      <div className="signal"><i/><i/><i/><i/></div>
    </section>

    <section className="partner" id="socio">
      <div className="partner-portrait reveal">
        <div className="portrait-frame"><img src="/brand/carlos-verdi.png" alt="Carlos A. Verdi, socio director de Vision Advisors" /></div>
        <div className="portrait-caption"><span>Socio director</span><i>Vision Advisors</i></div>
      </div>
      <div className="partner-copy reveal">
        <p className="section-kicker">Quiénes somos</p>
        <h2>Visión que integra<br/><em>cada disciplina.</em></h2>
        <div className="about-copy">
          <p>Vision Advisors Latam es una firma multidisciplinaria con más de 13 años de experiencia que integra contabilidad, estrategia fiscal, finanzas, nómina y derecho corporativo bajo una misma visión.</p>
          <p>Acompañamos a emprendedores, personas físicas y empresas en crecimiento para transformar obligaciones complejas en procesos claros, información útil y decisiones con mayor certeza.</p>
          <p>Nuestro enfoque es cercano y preventivo: entendemos la operación, identificamos riesgos y diseñamos soluciones a la medida, con especial experiencia en restaurantes, constructoras y organizaciones del sector médico.</p>
        </div>
        <div className="partner-name"><span>SOCIO DIRECTOR</span><h3>Carlos A. <em>Verdi</em></h3></div>
        <p className="partner-lead">Contador público y abogado con una formación que integra finanzas, estrategia fiscal, derecho constitucional y defensa del patrimonio empresarial.</p>
        <div className="credentials">
          <div><span>01</span><p>Contador Público, miembro activo del Colegio de Contadores Públicos de Chiapas (CCPCH)</p></div>
          <div><span>02</span><p>Licenciado en Derecho</p></div>
          <div><span>03</span><p>Maestro en Finanzas Estratégicas</p></div>
          <div><span>04</span><p>Maestro en Derecho Fiscal</p></div>
          <div><span>05</span><p>Maestro en Derecho Constitucional y Amparo</p></div>
          <div><span>06</span><p>Doctorante en Derecho Fiscal</p></div>
        </div>
        <div className="partner-focus"><b>EXPERIENCIA PRINCIPAL</b><p>Contabilidad, impuestos y derecho corporativo, con especial experiencia en restaurantes, constructoras y organizaciones del sector médico.</p></div>
      </div>
    </section>

    <section className="method" id="metodo">
      <div className="method-intro reveal"><p className="section-kicker">Nuestro método</p><h2>De la complejidad<br/>a una ruta <em>clara.</em></h2></div>
      <div className="timeline">
        {steps.map((s, i) => <article className="step reveal" key={s[0]} style={{transitionDelay:`${i*90}ms`}}><div className="step-top"><span>{s[0]}</span><i/></div><h3>{s[1]}</h3><p>{s[2]}</p></article>)}
      </div>
    </section>

    <section className="contact" id="contacto">
      <div className="contact-orb" aria-hidden="true" />
      <div className="contact-copy reveal"><p className="section-kicker light">El siguiente paso</p><h2>Conversemos sobre<br/>lo que <em>sigue.</em></h2><p>Cuéntanos el reto. Nosotros te ayudamos a verlo desde todos los ángulos.</p></div>
      <div className="contact-card glass reveal">
        <span className="status"><i/> Atención personalizada</span>
        <h3>Solicita una conversación inicial</h3>
        <p>Escríbenos por WhatsApp para compartirnos tu necesidad y coordinar una conversación inicial.</p>
        <a href="https://wa.me/529612320183?text=Hola%20Vision%20Advisors%2C%20me%20interesa%20recibir%20informaci%C3%B3n%20sobre%20sus%20servicios." target="_blank" rel="noreferrer" className="button whatsapp"><span className="wa">◉</span> WhatsApp · 961 232 0183 <b>↗</b></a>
        <small>Respuesta personalizada · Tuxtla Gutiérrez, Chiapas</small>
      </div>
    </section>

    <footer>
      <div className="footer-brand"><img src="/brand/vision-advisors-logo.png" alt="Vision Advisors"/><p>Contabilidad · Fiscal · Corporativo</p></div>
      <div><b>OFICINA</b><p>Roble 104, Fracc. El Bosque<br/>Tuxtla Gutiérrez, Chiapas</p></div>
      <div><b>CONTACTO</b><a href="mailto:contacto@visionadvisors.com.mx">contacto@visionadvisors.com.mx</a><a href="https://wa.me/529612320183" target="_blank" rel="noreferrer">961 232 0183 · WhatsApp</a></div>
      <div className="footer-bottom"><span>© 2026 Vision Advisors</span><span>Privacidad · Términos</span><a href="#inicio">Volver arriba ↑</a></div>
    </footer>

    {windowContent && <div className="window-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setWindowContent(null)}>
      <section className="detail-window" role="dialog" aria-modal="true" aria-labelledby="window-title">
        <div className="window-bar"><div><i/><i/><i/></div><span>VISION ADVISORS · PERSPECTIVA</span><button onClick={() => setWindowContent(null)} aria-label="Cerrar ventana">Cerrar ×</button></div>
        <div className="detail-window-body">
          <p className="section-kicker">{windowContent.eyebrow}</p>
          <h2 id="window-title">{windowContent.title}</h2>
          <p className="window-lead">{windowContent.intro}</p>
          <div className="window-body-copy">{windowContent.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          {windowContent.meta && <div className="detail-meta">{windowContent.meta}</div>}
          {windowContent.action && <a className="button primary" href="#contacto" onClick={() => setWindowContent(null)}>{windowContent.action}<span>↗</span></a>}
        </div>
      </section>
    </div>}
  </main>;
}
