/* ===================================================
   SOLICITAR ASISTENTE

   La pantalla pública para la Familia: qué ofrece el producto, los dos caminos
   para encontrar un Asistente, cómo funciona y el formulario de consulta. Es la
   misma que estaba escrita como página suelta; lo único que cambió es que la
   dibuja React.

   **Por qué ésta sí abre la puerta a la base, y la de acompañamiento no.** La
   página suelta cargaba el acceso a datos y la sesión, y de eso dependían dos
   cosas que se ven: las tarjetas de la oferta, que salen de la base cuando la
   base está al alcance y del archivo cuando no; y el formulario de consulta,
   que guarda si hay sesión con Prestadora resuelta y ofrece el correo si no.
   Sin abrir la puerta, las dos caerían siempre del lado del respaldo, que es un
   cambio de comportamiento y no un cambio de envase.

   **La oferta se pide recién cuando la puerta terminó de abrirse** —haya abierto
   o no—, que es el orden que antes garantizaban los `<script>` de la página: el
   acceso a datos ya estaba puesto cuando el catálogo salía a buscar las
   tarjetas. Pedirla antes la mandaría siempre al archivo de respaldo.

   **El resto de la pantalla no espera a nada.** Las secciones escritas se ven de
   entrada, igual que antes, y los cuatro estados viven donde hay una carga: la
   grilla de la oferta, y el formulario de consulta que los trae puestos.
=================================================== */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { aLaRuta, aLaImagen } from '../armazon/direcciones.js';
import { Catalogo, marca } from '#comun/frases/lector.js';
import { useLaBase } from '#comun/datos/useLaBase.js';
import FormularioDeConsulta from '../formularios/FormularioDeConsulta.jsx';

/* Cuáles de las tarjetas de la oferta muestra esta pantalla, y en qué orden.
   No es un catálogo escrito a mano: el catálogo entero sigue viniendo de la
   base, y esto es lo que antes decía el atributo `data-oferta-solo` de la
   página —qué elige mostrar esta pantalla de todo lo que hay—. */
const SERVICIOS = [
  'busco_asistente',
  'acompanamiento_online',
  'cursos',
  'monitoreo',
  'asistente_virtual',
  'vida_activa'
];

/* Las tarjetas de la oferta, con sus cuatro estados. El catálogo las trae de la
   vista pública cuando la base está al alcance y del archivo de respaldo cuando
   no, y eso lo decide él: acá sólo se espera el resultado y se elige, en el
   orden pedido, lo que esta pantalla muestra.

   `esperar` es lo que mantiene el orden de antes: mientras la puerta no haya
   terminado de abrirse no se pide nada. */
function useOferta(cual, cuales, esperar) {
  const [estado, setEstado] = useState('cargando');
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (esperar) return undefined;
    let vigente = true;

    Catalogo.cargarOferta()
      .then((oferta) => {
        if (!vigente) return;
        const lista = (oferta && oferta[cual]) || [];
        const elegidos = cuales.map((c) => lista.filter((i) => i.clave === c)[0]).filter(Boolean);
        /* Una clave pedida que el catálogo no tiene deja un hueco que en la
           pantalla no se nota: la grilla queda con una tarjeta menos y nadie se
           entera. Se dice acá, como se decía antes. */
        if (cuales.length !== elegidos.length) {
          console.error('Catálogo: «' + cual + '» no tiene todas las claves pedidas: '
            + cuales.filter((c) => !lista.some((i) => i.clave === c)).join(', '));
        }
        setItems(elegidos);
        setEstado(elegidos.length ? 'listo' : 'vacio');
      })
      .catch((err) => {
        console.error('Catálogo:', err.message);
        if (vigente) setEstado('error');
      });

    return () => { vigente = false; };
  }, [cual, cuales, esperar]);

  return { estado, items };
}

export default function SolicitarAsistente() {
  const { frase } = useFrases();
  const { estado: puerta } = useLaBase();
  const servicios = useOferta('servicios', SERVICIOS, puerta === 'cargando');

  usePestana('nav.solicitar_asistente', { descripcion: 'solicitar.descripcion' });

  return (
    <>
      <section className="inner-hero">
        <h1>{frase('nav.solicitar_asistente')}</h1>
        <p>{frase('solicitar.bajada')}</p>
        <div className="flex gap-16 justificar-centro envolver">
          <Link to="/directorio" className="btn btn-atencion">
            {frase('solicitar.ver_asistentes')}
          </Link>
          <a href="#como-funciona" className="btn btn-sobre-oscuro">
            {frase('solicitar.como_funciona')}
          </a>
        </div>
      </section>

      <section className="services-grid fondo-azul-oscuro" style={{ padding: '60px 24px' }}>
        <div className="centrar-texto" style={{ marginBottom: '40px' }}>
          <h2 className="color-sobre-color texto-28 peso-800">
            {frase('solicitar.servicios_titulo')}
          </h2>
        </div>

        {/* Las tarjetas salen del catálogo de la oferta, con su nombre y su
            bajada ya traducidos: acá no hay ningún texto que convertir. */}
        <div className="grid m-centrado" style={{ maxWidth: '1200px' }}>
          {servicios.estado === 'cargando' && <p>{frase('catalogo.cargando')}</p>}
          {servicios.estado === 'error' && <p>{frase('catalogo.error')}</p>}
          {servicios.estado === 'vacio' && <p>{frase('catalogo.sin_contenido')}</p>}
          {servicios.estado === 'listo' && servicios.items.map((item) => (
            <Link
              key={item.clave}
              to={aLaRuta(Catalogo.campo(item, 'enlace'))}
              id={Catalogo.campo(item, 'ancla') || undefined}
              className="service-card fade-in"
            >
              <img
                src={aLaImagen(Catalogo.campo(item, 'imagen'))}
                alt={marca(Catalogo.campo(item, 'nombre'))}
              />
              <div className="service-card-overlay">
                <h3>{marca(Catalogo.campo(item, 'nombre'))}</h3>
                <p>{marca(Catalogo.campo(item, 'descripcion'))}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Lo que las aplicaciones acompañan, y en qué carácter lo hacen. */}
      <section className="insurance-section">
        <div className="grilla grilla-2 alinear-centro m-centrado" style={{ maxWidth: '960px', gap: '40px' }}>
          <div>
            <span className="eyebrow color-info peso-700 texto-13 mayusculas">
              {frase('solicitar.durante_eyebrow')}
            </span>
            <h2 className="peso-800 color-principal" style={{ fontSize: '26px', margin: '8px 0 12px 0' }}>
              {frase('solicitar.durante_pregunta')}
            </h2>
            <p className="color-secundario texto-14 interlineado-16 mb-20">
              {frase('solicitar.durante_bajada')}
            </p>
            <ul
              className="flex gap-10 texto-13 color-principal peso-600 m-0"
              style={{ listStyle: 'none', padding: 0, flexDirection: 'column' }}
            >
              <li>
                <i className="fas fa-check-circle color-azul-medio mr-8"></i>{' '}
                <span>{frase('solicitar.durante_punto_asistencia')}</span>
              </li>
              <li>
                <i className="fas fa-check-circle color-azul-medio mr-8"></i>{' '}
                <span>{frase('solicitar.durante_punto_comunicacion')}</span>
              </li>
              <li>
                <i className="fas fa-check-circle color-azul-medio mr-8"></i>{' '}
                <span>{frase('solicitar.durante_punto_notificaciones')}</span>
              </li>
            </ul>
          </div>
          <div
            className="fondo-superficie-hundida borde-tarjeta redondeo-grande centrar-texto"
            style={{ padding: '28px' }}
          >
            <i className="fas fa-handshake color-titulo mb-12" style={{ fontSize: '42px' }}></i>
            <h4 className="texto-16 peso-700" style={{ margin: '0 0 8px 0' }}>
              {frase('solicitar.trato_titulo')}
            </h4>
            <p className="texto-12 color-secundario" style={{ marginBottom: '18px' }}>
              {frase('solicitar.trato_bajada')}
            </p>
            <a href="#como-funciona" className="btn btn-secundario texto-13" style={{ padding: '10px 24px' }}>
              {frase('solicitar.trato_boton')}
            </a>
          </div>
        </div>
      </section>

      {/* Los dos caminos del mercado: el directorio y el aviso. */}
      <section className="care-manager-section" id="caminos">
        <div className="grilla grilla-2 alinear-centro m-centrado" style={{ maxWidth: '960px', gap: '40px' }}>
          <div className="fade-in">
            <span className="eyebrow color-info peso-700 texto-13 mayusculas">
              {frase('solicitar.caminos_eyebrow')}
            </span>
            <h2 className="texto-28 peso-800 color-principal" style={{ margin: '8px 0 12px 0' }}>
              {frase('solicitar.caminos_titulo')}
            </h2>
            <p className="color-secundario texto-14 interlineado-16 mb-20">
              {frase('solicitar.caminos_bajada')}
            </p>
            <div className="flex gap-12 envolver mb-20">
              <span className="fondo-info color-info texto-12 peso-700 p-6-12 redondeo-20">
                <i className="fas fa-user-check"></i>{' '}
                <span>{frase('solicitar.caminos_chip_validados')}</span>
              </span>
              {/* `color-exito` no sirve acá: nombra `--verde-exito-texto`, que es
                  otro tono que el de este par de fondo y letra. */}
              <span
                className="fondo-exito texto-12 peso-700 p-6-12 redondeo-20"
                style={{ color: 'var(--tono-exito-texto)' }}
              >
                <i className="fas fa-building"></i>{' '}
                <span>{frase('solicitar.caminos_chip_prestadora')}</span>
              </span>
            </div>
            <Link to="/directorio" className="btn btn-secundario texto-14" style={{ padding: '12px 28px' }}>
              <i className="fas fa-address-book"></i>{' '}
              <span>{frase('solicitar.caminos_boton')}</span>
            </Link>
          </div>

          {/* El otro camino: publicar un aviso. */}
          <div
            className="fade-in fondo-azul-oscuro color-sobre-color redondeo-grande sombra-alta"
            style={{ padding: '32px' }}
          >
            <div className="flex alinear-centro gap-10 mb-12">
              <span
                className="fondo-azul-medio color-sobre-color texto-10 peso-800 redondeo-12 mayusculas"
                style={{ padding: '3px 8px' }}
              >
                <i className="fas fa-bullhorn"></i>{' '}
                <span>{frase('solicitar.aviso_badge')}</span>
              </span>
              <h4 className="m-0 texto-18 peso-800 color-sobre-color">
                {frase('solicitar.aviso_titulo')}
              </h4>
            </div>
            <p className="texto-13 mb-20" style={{ opacity: 0.9, lineHeight: 1.5 }}>
              {frase('solicitar.aviso_bajada')}
            </p>
            <Link to="/registrar-familia" className="btn btn-atencion ancho-total centrar-texto peso-800">
              <i className="fas fa-paper-plane"></i>{' '}
              <span>{frase('solicitar.aviso_boton')}</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="steps-section" id="como-funciona">
        <div className="container">
          {/* Dos claves y no una: lo que necesita una etiqueta adentro se parte
              en dos, porque una frase se escribe entera y el corte de renglón es
              del diseño. */}
          <h2 className="fade-in">
            <span>{frase('solicitar.pasos_titulo_1')}</span>
            <br />
            <span>{frase('solicitar.pasos_titulo_2')}</span>
          </h2>
          <div className="steps-layout">
            <div className="steps-phone fade-in">
              <div className="fondo-azul-oscuro redondeo-40 p-14 ancho-maximo-280 m-centrado sombra-alta">
                <div className="fondo-superficie redondeo-28 recortar p-16" style={{ minHeight: '400px' }}>
                  <div
                    className="mb-12"
                    style={{
                      background: 'linear-gradient(to right, var(--verde-exito), var(--naranja-alerta), var(--azul-medio))',
                      height: '4px',
                      borderRadius: '2px'
                    }}
                  ></div>
                  {/* El dibujo de un celular. Lo que se lee adentro se lee igual
                      que el resto de la pantalla, así que sale del catálogo y no
                      de acá. */}
                  <h4 className="texto-14 peso-800 centrar-texto color-titulo mb-10">
                    {frase('solicitar.mock_nuevo_aviso')}
                  </h4>
                  <div className="texto-11 color-secundario mb-6">
                    {frase('solicitar.mock_tipo_cuidado')}
                  </div>
                  <div className="borde-tarjeta redondeo-6 p-8 texto-12 mb-8">
                    {frase('solicitar.mock_tipo_valor')}
                  </div>
                  <div className="texto-11 color-secundario mb-6">
                    {frase('solicitar.mock_zona')}
                  </div>
                  <div className="borde-tarjeta redondeo-6 p-8 texto-12 mb-8">
                    {frase('solicitar.mock_zona_valor')}
                  </div>
                  <div className="texto-11 color-secundario mb-6">
                    {frase('solicitar.mock_caracteristicas')}
                  </div>
                  <div
                    className="borde-tarjeta redondeo-6 p-8 texto-12 mb-12 color-secundario"
                    style={{ height: '50px' }}
                  >
                    {frase('solicitar.mock_caracteristicas_valor')}
                  </div>
                  <div className="fondo-azul-oscuro color-sobre-color redondeo-6 p-10 centrar-texto texto-12 peso-700">
                    {frase('solicitar.mock_confirmar')}
                  </div>
                </div>
              </div>
            </div>
            <div className="steps-list">
              <div className="step-item fade-in">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>{frase('solicitar.paso1_titulo')}</h4>
                  <p>{frase('solicitar.paso1_bajada')}</p>
                </div>
              </div>
              <div className="step-item fade-in">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>{frase('solicitar.paso2_titulo')}</h4>
                  <p>{frase('solicitar.paso2_bajada')}</p>
                </div>
              </div>
              <div className="step-item fade-in">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>{frase('solicitar.paso3_titulo')}</h4>
                  <p>{frase('solicitar.paso3_bajada')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="cta-banner">
        {/* La misma frase que el botón del encabezado. Las mayúsculas las pone
            el estilo —`.cta-banner .btn`—, así que no hacen falta dos claves. */}
        <Link to="/directorio" className="btn btn-atencion">
          {frase('solicitar.ver_asistentes')}
        </Link>
      </div>

      <section className="feature-section">
        <div className="feature-layout">
          <div className="feature-text fade-in">
            <p className="eyebrow">{frase('solicitar.seguridad_eyebrow')}</p>
            <h2>{frase('solicitar.seguridad_titulo')}</h2>
            <p>{frase('solicitar.seguridad_bajada')}</p>
            <Link to="/directorio" className="btn btn-primario">
              {frase('solicitar.ver_directorio')}
            </Link>
          </div>
          <div className="feature-image fade-in">
            <img
              src="/assets/images/perfil_sandra.png"
              alt={frase('solicitar.seguridad_imagen_alt')}
              className="alto-400 cubrir redondeo-grande"
            />
          </div>
        </div>
      </section>

      <section className="feature-section fondo-superficie" id="gestor">
        <div className="feature-layout m-centrado" style={{ maxWidth: '1100px' }}>
          <div className="feature-image fade-in">
            <img
              src="/assets/images/gestor_medicamentos.png"
              alt={frase('solicitar.gestion_titulo')}
              className="alto-380 cubrir redondeo-grande"
            />
          </div>
          <div className="feature-text fade-in">
            <p className="eyebrow">{frase('solicitar.gestion_eyebrow')}</p>
            <h2>{frase('solicitar.gestion_titulo')}</h2>
            <p>{frase('solicitar.gestion_bajada')}</p>
            <a href="#como-funciona" className="btn btn-atencion">
              {frase('solicitar.empezar')}
            </a>
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-layout">
          <div className="contact-image fade-in">
            <img src="/assets/images/mujer_consultando.png" alt={frase('solicitar.consulta_titulo')} />
          </div>
          <div className="contact-form fade-in">
            <h2>{frase('solicitar.consulta_titulo')}</h2>
            <p>{frase('solicitar.consulta_bajada')}</p>
            {/* El mismo formulario que atienden las otras tres pantallas de
                consulta, con el vocabulario que pedía ésta y sin motivo fijo,
                que es lo que decía el marcado de antes. */}
            <FormularioDeConsulta
              rotulos={{
                pregunta: 'solicitar.consulta_motivo',
                elegir: 'solicitar.elija_opcion',
                novedades: 'solicitar.consulta_novedades',
                enviar: 'solicitar.consulta_enviar',
              }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
