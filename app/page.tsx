"use client";

import { useEffect, useRef, useState } from "react";

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

export default function Home() {
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState(0);
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
        <a href="#socio" onClick={() => setMenu(false)}>Quiénes somos</a>
        <a href="#metodo" onClick={() => setMenu(false)}>Método</a>
        <a className="nav-cta" href="#contacto" onClick={() => setMenu(false)}>Solicitar diagnóstico <span>↗</span></a>
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
        {services.map((s, i) => <article key={s.n} className={`service-card ${active === i ? "active" : ""}`} onMouseEnter={() => setActive(i)} tabIndex={0} onFocus={() => setActive(i)}>
          <span className="service-num">{s.n}</span>
          <div className="service-main"><h3>{s.title}</h3><p>{s.text}</p><div className="tags">{s.tags.map(t => <span key={t}>{t}</span>)}</div></div>
          <span className="service-arrow">↗</span>
        </article>)}
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
  </main>;
}
