/* ===================================================
   CURSOS DE CUIDADO

   Pantalla pública, y la primera portada que sí necesita la base: la oferta de
   cursos sale de la vista `oferta_de_cursos` —la oferta, no el contenido— y el
   catálogo la pide a través de `ClienteDatos`. Por eso acá se abre la puerta
   antes de pedirle nada al catálogo: sin `window.ClienteDatos` puesto, el
   catálogo no se queja, se cae al archivo de respaldo y muestra la lista de ahí
   sin que nadie se entere. Abrir primero y pedir después es lo que hace que lo
   que se vea sea lo que hay en la base.

   **Ninguna tarjeta está escrita acá.** El molde vivía en un `<template>` de la
   página y el contenido en el catálogo; ahora el molde es este componente y el
   contenido sigue saliendo del mismo lugar. `Catalogo.campo()` resuelve cada
   dato igual que antes: el nombre y la descripción por idioma, y la modalidad
   traducida contra el vocabulario `modalidad_curso`, que es para lo que además
   se pide `Catalogo.cargar()`. Sin esa segunda carga la tarjeta mostraría
   «online» crudo en las tres lenguas.

   **Los cuatro estados de la grilla son los mismos cuatro que dibujaba el
   catálogo sobre la página suelta**, con sus mismas frases de arranque:
   cargando mientras la oferta viaja, error si no llegó, «no hay nada para
   mostrar» si llegó vacía, y las tarjetas cuando hay. Una grilla vacía y una
   que todavía no llegó se ven igual, y ésa es justamente la falla que esto
   viene a no tener.
=================================================== */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrases } from '../frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { Catalogo, marca } from '../frases/lector.js';
import { conLaBase } from '../datos/puerta.js';
import FormularioDeConsulta from '../formularios/FormularioDeConsulta.jsx';

/* El catálogo guarda la imagen como la escribía una página suelta que vivía en
   la raíz —«assets/images/…»—, y una dirección así se lee contra la dirección
   que esté abierta. Con las pantallas convertidas en vistas de un solo programa
   eso deja de ser seguro, así que se la ancla a la raíz. Lo que ya venga
   absoluto o de afuera se deja tal cual. */
const direccionDeImagen = (ruta) => {
  if (!ruta) return '';
  if (/^([a-z]+:)?\/\//i.test(ruta) || ruta.charAt(0) === '/') return ruta;
  return '/' + ruta;
};

export default function Cursos() {
  const { frase } = useFrases();

  usePestana('cursos.titulo', { descripcion: 'cursos.descripcion' });

  const [estado, setEstado] = useState('cargando');
  const [cursos, setCursos] = useState([]);

  useEffect(() => {
    let vigente = true;

    (async () => {
      try {
        /* La puerta antes que el catálogo, por lo dicho arriba. Si no abre no se
           corta la pantalla: el catálogo tiene su respaldo en archivo y con él
           la oferta se ve igual, que es exactamente lo que pasaba cuando esta
           página se abría sin conexión. */
        await conLaBase().catch((err) => {
          console.error('Cursos, la base no está al alcance:', err);
        });
        if (!vigente) return;

        const [oferta] = await Promise.all([Catalogo.cargarOferta(), Catalogo.cargar()]);
        if (!vigente) return;

        const lista = (oferta && oferta.cursos) || [];
        setCursos(lista);
        setEstado(lista.length ? 'listo' : 'vacio');
      } catch (err) {
        console.error('Cursos, oferta:', err);
        if (vigente) setEstado('error');
      }
    })();

    return () => { vigente = false; };
  }, []);

  return (
    <>
      <section className="inner-hero">
        <h1>{frase('cursos.titulo')}</h1>
        <p>{frase('cursos.bajada')}</p>
        <a href="#cursos" className="btn btn-atencion">{frase('cursos.ver_disponibles')}</a>
      </section>

      <section className="feature-section fondo-superficie-hover">
        <div className="feature-layout">
          <div className="feature-text fade-in">
            <p className="eyebrow">{frase('cursos.aprender_a_cuidar')}</p>
            <h2>{frase('cursos.herramientas_practicas')}</h2>
            <p>{frase('cursos.intro_bajada')}</p>
            <p className="mt-12">{frase('cursos.intro_modalidad')}</p>
          </div>
          <div className="feature-image fade-in">
            <img
              className="alto-380 cubrir redondeo-grande"
              src="/assets/images/cursos_familias.png"
              alt={frase('cursos.imagen_intro')}
            />
          </div>
        </div>
      </section>

      <section className="fondo-superficie-hover" id="cursos" style={{ padding: '40px 24px 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 className="fade-in texto-28 peso-800 mb-12 centrar-texto">
            {frase('cursos.disponibles')}
          </h2>
          <p
            className="fade-in centrar-texto color-secundario texto-14"
            style={{ maxWidth: 640, margin: '0 auto 40px auto' }}
          >
            {frase('cursos.oferta_bajada')}
          </p>

          {estado === 'cargando' && <p>{frase('catalogo.cargando')}</p>}
          {estado === 'error' && <p>{frase('catalogo.error')}</p>}
          {estado === 'vacio' && <p>{frase('catalogo.sin_contenido')}</p>}

          {estado === 'listo' && (
            <div className="courses-grid">
              {cursos.map((curso) => {
                /* Cada dato pasa por `campo()` y después por `marca()`, igual que
                   cuando el catálogo rellenaba el molde: el texto del catálogo
                   puede traer marcadores de marca adentro, y sin resolverlos se
                   leería «{'{{'}producto{'}}'}» en la tarjeta. */
                const nombre = marca(Catalogo.campo(curso, 'nombre'));
                return (
                  <div className="course-card fade-in" key={curso.clave}>
                    <div className="course-card-img">
                      <img
                        src={direccionDeImagen(marca(Catalogo.campo(curso, 'imagen')))}
                        alt={nombre}
                      />
                    </div>
                    <div className="course-card-body">
                      <span className="course-tag">{marca(Catalogo.campo(curso, 'etiqueta'))}</span>
                      <h3>{nombre}</h3>
                      <p>{marca(Catalogo.campo(curso, 'descripcion'))}</p>
                      <div className="course-meta">
                        <span>
                          <i className="fas fa-clock"></i>{' '}
                          <span>{marca(Catalogo.campo(curso, 'horas'))}</span>{' '}
                          <span>{frase('cursos.horas')}</span>
                        </span>
                        <span>
                          <i className="fas fa-video"></i>{' '}
                          <span>{marca(Catalogo.campo(curso, 'modalidad@modalidad_curso'))}</span>
                        </span>
                        {/* El sello sólo aparece cuando el curso lo otorga: un
                            curso sin certificado no muestra el sello vacío, no
                            muestra ninguno. */}
                        {Catalogo.campo(curso, 'certificado') && (
                          <span>
                            <i className="fas fa-certificate"></i>{' '}
                            <span>{frase('cursos.certificado')}</span>
                          </span>
                        )}
                      </div>
                      <a
                        href="#inscribirse"
                        className="btn btn-primario texto-12"
                        style={{ padding: '10px 20px' }}
                      >
                        {frase('cursos.inscribirse')}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div
            className="fade-in fondo-superficie borde-tarjeta redondeo-grande sombra-suave centrar-texto"
            style={{ padding: 40, marginTop: 50 }}
          >
            <span className="eyebrow color-info peso-700 texto-13 mayusculas">
              {frase('cursos.academia')}
            </span>
            <h2 className="peso-800 color-principal" style={{ fontSize: 26, margin: '6px 0 10px 0' }}>
              {frase('cursos.evaluacion_competencias')}
            </h2>
            <p className="color-secundario texto-14" style={{ maxWidth: 600, margin: '0 auto 24px auto' }}>
              {frase('cursos.evaluacion_bajada')}
            </p>
            <Link to="/examen" className="btn btn-primario" style={{ padding: '12px 28px' }}>
              <i className="fas fa-edit"></i>{' '}
              <span>{frase('cursos.rendir_evaluacion')}</span>
            </Link>
            <p className="color-secundario texto-13" style={{ margin: '14px 0 0 0' }}>
              {frase('cursos.hace_falta_sesion')}
            </p>
          </div>
        </div>
      </section>

      <div className="cta-banner">
        {/* Se lee en mayúsculas por el estilo de `.cta-banner .btn`, no por cómo
            esté escrita la frase: en el catálogo va en su forma normal. */}
        <a href="#inscribirse" className="btn btn-atencion">{frase('cursos.inscribirme_ya')}</a>
      </div>

      <section className="contact-section" id="inscribirse">
        <div className="contact-layout">
          <div className="contact-image fade-in">
            <img src="/assets/images/mujer_consultando.png" alt={frase('cursos.imagen_inscripcion')} />
          </div>
          <div className="contact-form fade-in">
            <h2>{frase('cursos.inscribase')}</h2>
            <p>{frase('cursos.inscripcion_bajada')}</p>
            {/* El mismo formulario de las otras pantallas públicas, sin copia.
                Acá el motivo ya se sabe —quien llega por esta pantalla pregunta
                por cursos—, así que se lo pasa fijo con la clave del vocabulario
                `motivo_consulta`, que es la que la página suelta llevaba escrita
                en `data-motivo`. */}
            <FormularioDeConsulta
              rotulos={{
                pregunta: 'consulta.dato_curso',
                elegir: 'cursos.elegir_curso',
                novedades: 'cursos.desea_novedades',
                enviar: 'cursos.enviar_solicitud',
              }}
              vocabulario="cursos"
              desdeLaOferta
              motivoFijo="cursos"
            />
          </div>
        </div>
      </section>
    </>
  );
}
