/* ===================================================
   INICIO

   La portada. Pantalla pública y demostrativa: no consulta la base, igual que
   antes. Por eso no pide la puerta —ni el acceso a datos ni la sesión—, y lo
   único que llega de afuera es el catálogo, por el mismo camino de siempre.

   La barra de arriba y el pie no están acá: los pone el enrutador, una vez para
   las siete pantallas que los llevan.

   **Las nueve tarjetas de la oferta siguen saliendo del catálogo.** Antes la
   pantalla declaraba un molde —un `<template>`— y el lector lo rellenaba
   recorriendo el documento. Adentro de React no hay documento que recorrer, así
   que el molde es un componente y el contenido se pide con `cargarOferta()`,
   que es exactamente la misma función que alimentaba al molde. De dónde viene
   ese contenido tampoco cambió: la vista de la base cuando hay conexión y quien
   la pida tiene con qué, y el archivo del catálogo cuando no —que es el caso de
   esta pantalla, que no abre la base—.

   **Y siguen estando los cuatro estados que ya tenía**, con las mismas frases:
   «cargando» mientras el catálogo viaja, «error» si no llegó, «vacío» cuando
   ninguna de las claves pedidas existe, y las tarjetas cuando sí. Una grilla que
   todavía no llegó y una que vino vacía se ven igual, y distinguirlas es la
   razón por la que esos cuatro estados existen.

   **Los destinos de las tarjetas los guarda el catálogo como se escribían
   cuando cada pantalla era un archivo suelto.** El lugar al que llevan es el
   mismo; lo único que cambia es que acá los abre el enrutador sin recargar, y
   por eso el nombre del archivo se traduce a la ruta al dibujar, en un solo
   lugar, en vez de tocar el catálogo.
=================================================== */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { aLaRuta, aLaImagen } from '#comun/direcciones.js';
import { Catalogo, marca } from '#comun/frases/lector.js';
import FormularioDeConsulta from '../formularios/FormularioDeConsulta.jsx';

/* Las tres grillas piden las mismas claves que pedían escritas en la página, y
   en el mismo orden: la oferta trae todo y cada fila muestra lo suyo. */
const PRIMERA_FILA = ['busco_asistente', 'acompanamiento_online', 'cursos'];
const SEGUNDA_FILA = ['monitoreo', 'asistente_virtual', 'vida_activa'];
const TERCERA_FILA = ['gestor_cuidado', 'productos_hogar', 'home'];

/* Lo que sabe hacer la Asistenta de la maqueta. Son datos inventados —ninguna
   persona real entra en una pantalla de demostración—, y aun así el texto sale
   del catálogo, porque es texto que alguien lee. */
const APTITUDES_DE_LA_MAQUETA = [
  'inicio.demo_deterioro_cognitivo',
  'inicio.demo_postrados',
  'inicio.demo_oncologico',
  'inicio.demo_medicos',
  'inicio.demo_ceguera',
  'inicio.demo_paseos'
];

/* Las iniciales de los días que muestra la maqueta del celular, tal como
   estaban escritas en la página. */
const DIAS_DE_LA_MAQUETA = ['L', 'M', 'J', 'V', 'S', 'D'];

const PASOS_DE_LA_FAMILIA = [
  { titulo: 'inicio.paso_descargar_titulo', texto: 'inicio.paso_descargar_texto' },
  { titulo: 'inicio.paso_publicar_titulo', texto: 'inicio.paso_publicar_texto' },
  { titulo: 'inicio.paso_encontrar_titulo', texto: 'inicio.paso_encontrar_texto' }
];

const PASOS_DE_LA_BUSQUEDA = [
  { titulo: 'inicio.paso_legajo_titulo', texto: 'inicio.paso_legajo_texto' },
  { titulo: 'inicio.paso_buscar_titulo', texto: 'inicio.paso_buscar_texto' },
  { titulo: 'inicio.paso_evaluar_titulo', texto: 'inicio.paso_evaluar_texto' },
  { titulo: 'inicio.paso_entrevistar_titulo', texto: 'inicio.paso_entrevistar_texto' },
  { titulo: 'inicio.paso_acordar_titulo', texto: 'inicio.paso_acordar_texto' }
];

/* Los cuatro celulares que rodean al del logotipo, con la inclinación y el
   tamaño que tenía cada uno. Es decoración, y la única razón por la que está
   escrito así es que cuatro bloques iguales con tres números distintos se leen
   peor que una lista de tres números. */
const CELULARES_DEL_MUESTRARIO = [
  { imagen: 'perfil_carmen.png', ancho: 160, alto: 200, giro: 'rotate(-8deg) translateY(30px)' },
  { imagen: 'perfil_laura.png', ancho: 180, alto: 240, giro: 'rotate(-4deg) translateY(15px)' },
  { imagen: 'perfil_maria.png', ancho: 180, alto: 240, giro: 'rotate(4deg) translateY(15px)' },
  { imagen: 'perfil_ana.png', ancho: 160, alto: 200, giro: 'rotate(8deg) translateY(30px)' }
];

const TAREAS_DEL_CUIDADO = [
  { icono: '🧘', titulo: 'inicio.tarea_vida_diaria_titulo', texto: 'inicio.tarea_vida_diaria_texto' },
  { icono: '💊', titulo: 'inicio.tarea_medicamentos_titulo', texto: 'inicio.tarea_medicamentos_texto' },
  { icono: '🚶', titulo: 'inicio.tarea_paseos_titulo', texto: 'inicio.tarea_paseos_texto' },
  { icono: '🏥', titulo: 'inicio.tarea_medica_titulo', texto: 'inicio.tarea_medica_texto' },
  { icono: '🍳', titulo: 'inicio.tarea_comidas_titulo', texto: 'inicio.tarea_comidas_texto' },
  { icono: '🧹', titulo: 'inicio.tarea_hogar_titulo', texto: 'inicio.tarea_hogar_texto' },
  { icono: '💬', titulo: 'inicio.tarea_compania_titulo', texto: 'inicio.tarea_compania_texto' },
  { icono: '🌙', titulo: 'inicio.tarea_nocturna_titulo', texto: 'inicio.tarea_nocturna_texto' }
];

const EN_LOS_MEDIOS = [
  { color: 'red', medio: 'inicio.prensa_la_nacion', cita: 'inicio.prensa_cita_la_nacion' },
  { color: 'blue', medio: 'inicio.prensa_el_cronista', cita: 'inicio.prensa_cita_el_cronista' },
  { color: 'orange', medio: 'inicio.prensa_pymes', cita: 'inicio.prensa_cita_pymes' }
];


/* ── La oferta, pedida una sola vez para las tres grillas ────────────────── */
function useOferta() {
  const [estado, setEstado] = useState('cargando');
  const [servicios, setServicios] = useState([]);

  useEffect(() => {
    let vigente = true;
    Catalogo.cargarOferta()
      .then((oferta) => {
        if (!vigente) return;
        setServicios((oferta && oferta.servicios) || []);
        setEstado('listo');
      })
      .catch((err) => {
        console.error('Inicio, la oferta:', err);
        if (vigente) setEstado('error');
      });
    return () => { vigente = false; };
  }, []);

  return { estado, servicios };
}

/* Una tarjeta de la oferta. El nombre y la descripción pasan por la marca
   porque el texto del catálogo puede traer marcadores —{{producto}}—, igual que
   los resolvía el molde. Sin enlace no se pone ninguno: es lo que hacía el
   molde, que escribía el atributo sólo cuando el ítem traía el dato. */
function TarjetaDeOferta({ item }) {
  const nombre = marca(Catalogo.texto(item));
  const descripcion = marca(Catalogo.textoDe(item.descripcion));
  const adentro = (
    <>
      <img src={aLaImagen(item.imagen)} alt={nombre} />
      <div className="service-card-overlay">
        <h3>{nombre}</h3>
        <p>{descripcion}</p>
      </div>
    </>
  );

  if (!item.enlace) return <a className="service-card fade-in">{adentro}</a>;
  return <Link className="service-card fade-in" to={aLaRuta(item.enlace)}>{adentro}</Link>;
}

/* Lo que todavía no salió no se dibuja igual que lo que ya está disponible: no
   lleva imagen, no lleva a ningún lado, y lo dice. */
function TarjetaProxima({ item }) {
  const { frase } = useFrases();

  return (
    <div className="service-card fade-in fondo-azul-oscuro" style={{ cursor: 'default' }}>
      <div className="badge-proximamente">{frase('inicio.proximamente')}</div>
      <div className="service-card-overlay sin-fondo relativo" style={{ padding: '40px 24px' }}>
        <h3>{marca(Catalogo.texto(item))}</h3>
        <p>{marca(Catalogo.textoDe(item.descripcion))}</p>
      </div>
    </div>
  );
}

/* `conProximamente` es el segundo molde que declaraba la tercera fila: las dos
   primeras no lo tenían, y sin él todo se dibuja como tarjeta con enlace. */
function GrillaDeOferta({ estado, servicios, claves, conProximamente = false }) {
  const { frase } = useFrases();
  const elegidos = claves.map((c) => servicios.filter((i) => i.clave === c)[0]).filter(Boolean);

  /* Una clave pedida que el catálogo no tiene es un error de quien la escribió,
     no de quien mira la pantalla: se dice por consola y se dibuja el resto. */
  useEffect(() => {
    if (estado !== 'listo') return;
    const faltan = claves.filter((c) => !servicios.some((i) => i.clave === c));
    if (faltan.length) {
      console.error('Inicio: la oferta no tiene todas las claves pedidas: ' + faltan.join(', '));
    }
  }, [estado, claves, servicios]);

  if (estado === 'cargando') {
    return <div className="grid"><p>{frase('catalogo.cargando')}</p></div>;
  }
  if (estado === 'error') {
    return <div className="grid"><p>{frase('catalogo.error')}</p></div>;
  }
  if (!elegidos.length) {
    return <div className="grid"><p>{frase('catalogo.sin_contenido')}</p></div>;
  }

  return (
    <div className="grid">
      {elegidos.map((item) => (
        conProximamente && item.estado === 'proximamente'
          ? <TarjetaProxima key={item.clave} item={item} />
          : <TarjetaDeOferta key={item.clave} item={item} />
      ))}
    </div>
  );
}

/* Los dos recorridos de pasos tienen la misma forma y se numeran solos; lo
   único que los distingue es el color del título. */
function Pasos({ pasos, resaltados = false }) {
  const { frase } = useFrases();

  return (
    <div className="steps-list">
      {pasos.map(({ titulo, texto }, cuantos) => (
        <div className="step-item fade-in" key={titulo}>
          <div className="step-number">{cuantos + 1}</div>
          <div className="step-content">
            <h4 className={resaltados ? 'color-azul-medio' : undefined}>{frase(titulo)}</h4>
            <p>{frase(texto)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* Los cuatro celulares del muestrario se dibujan igual; el del logotipo, que va
   en el medio, es el único distinto y está escrito aparte. */
function CelularDelMuestrario({ imagen, ancho, alto, giro }) {
  return (
    <div
      className="fondo-superficie redondeo-32 borde-azul-oscuro-3 p-10 sombra-media"
      style={{ width: ancho, transform: giro }}
    >
      <img
        className="ancho-total redondeo-22 cubrir"
        src={'/assets/images/' + imagen}
        style={{ height: alto }}
        alt=""
      />
    </div>
  );
}

export default function Inicio() {
  const { frase } = useFrases();
  const { estado, servicios } = useOferta();

  usePestana('inicio.titulo', { descripcion: 'inicio.descripcion' });

  return (
    <>
      <section className="hero">
        <h1>{frase('inicio.hero_titulo')}</h1>
        <div className="services-grid sin-fondo" style={{ padding: 0 }}>
          <GrillaDeOferta estado={estado} servicios={servicios} claves={PRIMERA_FILA} />
        </div>
      </section>

      <section className="services-grid">
        <GrillaDeOferta estado={estado} servicios={servicios} claves={SEGUNDA_FILA} />
      </section>

      <section className="services-grid pt-20">
        <GrillaDeOferta estado={estado} servicios={servicios} claves={TERCERA_FILA} conProximamente />
      </section>

      <div className="cta-block">
        <Link to="/solicitar-asistente" className="btn btn-atencion">
          {frase('inicio.descargar_aplicacion')}
        </Link>
        <a href="#contact" className="btn btn-primario">{frase('inicio.asesoramos')}</a>
      </div>

      <section className="steps-section">
        <div className="container">
          <h2 className="fade-in">{frase('inicio.pasos_titulo')}</h2>
          <div className="steps-layout">
            <div className="steps-phone fade-in">
              {/* Maqueta de celular hecha con estilos. Los datos son inventados:
                  ninguna persona real entra en una pantalla de demostración. */}
              <div className="fondo-azul-oscuro redondeo-40 p-14 ancho-maximo-280 m-centrado sombra-alta">
                <div className="fondo-superficie redondeo-28 recortar" style={{ minHeight: 500 }}>
                  <div style={{
                    background: 'linear-gradient(to right, var(--verde-exito), var(--naranja-alerta), var(--azul-medio))',
                    height: 4
                  }}></div>
                  <div className="p-16">
                    <div className="flex alinear-centro gap-10 mb-12">
                      <img
                        className="circulo cubrir"
                        src="/assets/images/perfil_marisa.png"
                        style={{ width: 48, height: 48 }}
                        alt=""
                      />
                      <div>
                        <div className="peso-700 texto-14">{frase('inicio.demo_nombre_asistenta')}</div>
                        <div className="texto-11 color-secundario">{frase('inicio.demo_edad_y_zona')}</div>
                        <div className="texto-14" style={{ color: 'var(--naranja-alerta-texto)' }}>
                          ★★★★★ <span className="color-secundario texto-11">{frase('inicio.demo_puntaje')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="texto-12 color-secundario mb-8">{frase('inicio.demo_profesion')}</div>
                    <div className="texto-11 color-secundario grilla grilla-2 mb-10" style={{ gap: 2 }}>
                      {APTITUDES_DE_LA_MAQUETA.map((clave) => (
                        <span key={clave}>✓ <span>{frase(clave)}</span></span>
                      ))}
                    </div>
                    <div className="color-azul-medio texto-11 peso-600 mb-8">
                      🕐 <span>{frase('directorio.urgencias')}</span>
                    </div>
                    <div
                      className="fondo-info color-info bloque-en-linea texto-10 peso-700 mb-10"
                      style={{ borderRadius: 4, padding: '2px 8px' }}
                    >
                      {frase('inicio.demo_retiro')}
                    </div>
                    <div className="flex" style={{ gap: 4 }}>
                      {DIAS_DE_LA_MAQUETA.map((dia, cuantos) => (
                        <span
                          key={dia + cuantos}
                          className="fondo-azul-oscuro color-sobre-color ancho-22 alto-22 circulo texto-9 peso-700 flex alinear-centro justificar-centro"
                        >{dia}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Pasos pasos={PASOS_DE_LA_FAMILIA} />
          </div>
        </div>
      </section>

      <div className="cta-banner">
        <Link to="/solicitar-asistente" className="btn btn-atencion">
          {frase('inicio.descargar_aplicacion')}
        </Link>
      </div>

      <section className="app-showcase">
        <div className="container">
          <h2 className="fade-in">{frase('inicio.app_titulo')}</h2>
          <p className="fade-in">{frase('inicio.app_bajada')}</p>
          <div className="phones-display fade-in">
            {CELULARES_DEL_MUESTRARIO.slice(0, 2).map((celular) => (
              <CelularDelMuestrario key={celular.imagen} {...celular} />
            ))}
            <div
              className="fondo-superficie redondeo-32 borde-azul-oscuro-3 p-20 sombra-alta"
              style={{ width: 200 }}
            >
              <img
                className="tenant-logo ancho-total redondeo-16"
                src={'/' + marca('{{logotipo}}')}
                style={{ height: 240, objectFit: 'contain' }}
                alt={frase('nav.inicio')}
              />
            </div>
            {CELULARES_DEL_MUESTRARIO.slice(2).map((celular) => (
              <CelularDelMuestrario key={celular.imagen} {...celular} />
            ))}
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-layout">
          <div className="contact-image fade-in">
            <img src="/assets/images/mujer_consultando.png" alt={frase('inicio.ayuda_titulo')} />
          </div>
          <div className="contact-form fade-in">
            <h2>{frase('inicio.ayuda_titulo')}</h2>
            <p>{frase('inicio.ayuda_bajada')}</p>
            <FormularioDeConsulta
              rotulos={{
                pregunta: 'consulta.motivo_pregunta',
                elegir: 'consulta.elija_opcion',
                novedades: 'consulta.novedades_pregunta',
                enviar: 'consulta.enviar',
              }}
            />
          </div>
        </div>
      </section>

      <section className="steps-section fondo-superficie">
        <div className="container">
          <h2 className="fade-in">{frase('inicio.cinco_pasos_titulo')}</h2>
          <div className="steps-layout">
            <div className="steps-phone fade-in">
              <div className="fondo-azul-oscuro redondeo-40 p-14 ancho-maximo-280 m-centrado sombra-alta">
                <div className="fondo-azul-medio redondeo-28 recortar p-20" style={{ minHeight: 360 }}>
                  <div
                    className="circulo flex alinear-centro justificar-centro"
                    style={{
                      background: 'var(--velo-sobre-color)',
                      width: 70,
                      height: 70,
                      margin: '0 auto 12px'
                    }}
                  >
                    <img
                      className="circulo cubrir"
                      src="/assets/images/perfil_sandra.png"
                      style={{ width: 60, height: 60 }}
                      alt=""
                    />
                  </div>
                  <div className="color-sobre-color centrar-texto peso-700 texto-15 mb-6">
                    {frase('inicio.demo_nombre_asistente')}
                  </div>
                  <div className="flex gap-10 justificar-centro mb-14">
                    <div
                      className="mayusculas fondo-velo-oscuro color-sobre-color redondeo-20 texto-11 peso-600"
                      style={{ padding: '6px 14px' }}
                    >
                      {frase('inicio.demo_ver_horarios')}
                    </div>
                    <div
                      className="mayusculas fondo-velo-oscuro color-sobre-color redondeo-20 texto-11 peso-600"
                      style={{ padding: '6px 14px' }}
                    >
                      {frase('inicio.demo_ver_tareas')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Pasos pasos={PASOS_DE_LA_BUSQUEDA} resaltados />
          </div>
        </div>
      </section>

      <section className="feature-section fondo-superficie-hover">
        <div className="feature-layout">
          <div className="feature-text fade-in">
            <p className="eyebrow">{frase('inicio.seguridad_eyebrow')}</p>
            <h2>{frase('inicio.seguridad_titulo')}</h2>
            <p>{frase('inicio.seguridad_texto')}</p>
            <Link to="/directorio" className="btn btn-primario">{frase('inicio.ver_directorio')}</Link>
          </div>
          <div className="feature-image fade-in">
            <img
              className="alto-380 cubrir redondeo-grande"
              src="/assets/images/perfil_patricia.png"
              alt={frase('inicio.seguridad_eyebrow')}
            />
          </div>
        </div>
      </section>

      <section
        className="feature-section feature-layout reverse fondo-superficie"
        style={{ padding: '80px 24px' }}
      >
        <div className="feature-layout m-centrado" style={{ maxWidth: 1100 }}>
          <div className="feature-image fade-in">
            <img
              className="alto-380 cubrir redondeo-grande"
              src="/assets/images/monitoreo_cuidado.png"
              alt={frase('inicio.gestion_imagen_alt')}
            />
          </div>
          <div className="feature-text fade-in">
            <p className="eyebrow">{frase('inicio.gestion_eyebrow')}</p>
            <h2>{frase('inicio.gestion_titulo')}</h2>
            <p>{frase('inicio.gestion_texto')}</p>
            <Link to="/solicitar-asistente" className="btn btn-atencion">
              {frase('inicio.empezar_ahora')}
            </Link>
          </div>
        </div>
      </section>

      <div className="cta-banner">
        <Link to="/solicitar-asistente" className="btn btn-atencion">
          {frase('inicio.descargar_aplicacion')}
        </Link>
      </div>

      <section className="help-section">
        <div className="container">
          <h2 className="fade-in">{frase('inicio.ayuda_seccion_titulo')}</h2>
          <div className="help-grid">
            {TAREAS_DEL_CUIDADO.map(({ icono, titulo, texto }) => (
              <div className="help-card fade-in" key={titulo}>
                <div className="icon" aria-hidden="true">{icono}</div>
                <h4>{frase(titulo)}</h4>
                <p>{frase(texto)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="press-section">
        <div className="container">
          <h2 className="fade-in">{frase('inicio.prensa_titulo')}</h2>
          <div className="press-grid">
            {EN_LOS_MEDIOS.map(({ color, medio, cita }) => (
              <div className="press-card fade-in" key={medio}>
                <div className={'press-card-header ' + color}>{frase(medio)}</div>
                <div className="press-card-body">
                  <p>{frase(cita)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
