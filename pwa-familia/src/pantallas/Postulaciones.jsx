/* ===================================================
   QUIÉNES SE POSTULARON

   El otro extremo del aviso. La Familia publicaba y no tenía dónde ver quién se
   había ofrecido; los dos caminos del mercado terminan en lo mismo —un
   contacto—, y éste es el que empieza del lado del Asistente.

   Acá no hay «aceptar» ni «rechazar»: hay contactar y descartar. El software no
   guarda ningún trato, y elegir con quién hablar es decisión de la Familia, no
   del sistema. Descartar tampoco borra nada: escribe una fecha y la fila queda,
   así que no lleva confirmación destructiva.

   Contactar es abrir la conversación, y nada más. Si la postulación ya trae una
   abierta, se entra derecho y no se crea nada: abrirla dos veces sería contar
   dos contactos por lo mismo.

   Los cuatro estados están todos, y los errores se guardan como clave del
   catálogo y no como texto ya escrito. Ninguno muestra lo que devolvió la base.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Catalogo, Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';

export default function Postulaciones({ activa, pedido, navegar, irAMensajes }) {
  const { frase } = useFrases();
  const [estado, setEstado] = useState('cargando');
  const [filas, setFilas] = useState([]);
  const [acceso, setAcceso] = useState(null);
  const [claveDelError, setClaveDelError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!pedido) return undefined;
    let vigente = true;
    setEstado('cargando');
    (async () => {
      try {
        const { ClienteDatos } = await conLaBase();
        const traidas = await ClienteDatos.postulacionesDeMisAvisos();
        await Catalogo.cargar();
        if (!vigente) return;
        setAcceso(ClienteDatos);
        if (!traidas || traidas.length === 0) { setFilas([]); setEstado('vacio'); return; }
        setFilas(traidas);
        setEstado('listo');
        /* Marcarlas vistas es consecuencia de haberlas mostrado, no condición
           para mostrarlas: si el marcado falla, la pantalla ya está dibujada y
           no se cae. */
        traidas.forEach((fila) => {
          if (fila.vista_el) return;
          ClienteDatos.marcarPostulacionVista(fila.id).catch((err) => {
            console.error('Marcar la postulación como vista:', err);
          });
        });
      } catch (err) {
        if (!vigente) return;
        setClaveDelError(Texto.claveDeError(err, frase('postulaciones.error')));
        setEstado('error');
      }
    })();
    return () => { vigente = false; };
  }, [pedido, intento]);

  const volverAPedir = () => setIntento((cuantos) => cuantos + 1);

  return (
    <div className={'app-screen' + (activa ? ' active' : '')} id="screen-postulaciones">
      <div className="app-header">
        <button className="btn-back" onClick={() => navegar('dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1 id="postulaciones-titulo">{frase('postulaciones.titulo')}</h1>
        <div className="ancho-24"></div>
      </div>

      <div className="p-16">
        <p className="texto-12 color-secundario m-0 mb-12" id="postulaciones-bajada">
          {frase('postulaciones.bajada')}
        </p>

        {estado === 'cargando' ? (
          <div className="pwa-estado" id="pos-cargando">{frase('postulaciones.cargando')}</div>
        ) : null}

        {estado === 'error' ? (
          <div className="pwa-estado" id="pos-error">
            <p id="pos-error-texto">
              {frase('postulaciones.error') + ' ' + frase(claveDelError)}
            </p>
            <button type="button" className="btn btn-primario" id="pos-reintentar"
              onClick={volverAPedir}>
              {frase('postulaciones.reintentar')}
            </button>
          </div>
        ) : null}

        {estado === 'vacio' ? (
          <div className="pwa-estado" id="pos-vacio">
            <p id="pos-vacio-titulo">{frase('postulaciones.vacio_titulo')}</p>
            <p className="pwa-estado-bajada" id="pos-vacio-bajada">
              {frase('postulaciones.vacio_bajada')}
            </p>
          </div>
        ) : null}

        {estado === 'listo' ? (
          <div id="postulaciones-lista">
            {filas.map((fila) => (
              <TarjetaDePostulacion key={fila.id} fila={fila} acceso={acceso}
                irAMensajes={irAMensajes} volverAPedir={volverAPedir} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* La tarjeta de cada postulación, que antes salía del molde declarado en la
   página. Lo que escribió el Asistente —su nombre y su mensaje— entra como
   texto y nunca como marcado. */
function TarjetaDePostulacion({ fila, acceso, irAMensajes, volverAPedir }) {
  const { frase } = useFrases();
  const [ocupada, setOcupada] = useState('');
  const [aviso, setAviso] = useState(null);

  /* La profesión y la zona son claves guardadas; su texto sale del catálogo. */
  const tipo = Catalogo.etiquetaSiExiste('tipo_asistente', fila.asistente_profesion);
  const zona = Catalogo.etiquetaSiExiste('zona', fila.asistente_zona);
  const linea = [tipo, zona].filter(Boolean).join(' · ');

  /* Sin foto va la inicial, como en las tarjetas del tablero. */
  const foto = acceso.urlDeFotoPublica(fila.asistente_foto);
  const inicial = (fila.asistente_nombre || '?').trim().charAt(0).toUpperCase();

  /* Una insignia por vez, y la de descartada gana: es lo último que pasó. */
  let insignia = null;
  if (fila.descartada_el) insignia = frase('postulaciones.descartada');
  else if (!fila.vista_el) insignia = frase('postulaciones.nueva');

  const mensaje = (fila.mensaje || '').trim();

  async function contactar() {
    if (fila.conversacion_id) { irAMensajes(fila.conversacion_id); return; }
    setOcupada('contactar');
    setAviso(null);
    try {
      const conversacion = await acceso.abrirConversacion(fila.caregiver_id, fila.aviso_id);
      fila.conversacion_id = conversacion.id;
      irAMensajes(conversacion.id);
    } catch (err) {
      const cual = 'postulaciones.error_contactar';
      setAviso({ cual, error: Texto.claveDeError(err, frase(cual)) });
    } finally {
      setOcupada('');
    }
  }

  async function descartar() {
    setOcupada('descartar');
    setAviso(null);
    try {
      await acceso.descartarPostulacion(fila.id);
      /* Se vuelve a pedir la lista en vez de retocar la tarjeta: lo que se ve
         sale del estado real y no de lo que esta pantalla supone. */
      volverAPedir();
    } catch (err) {
      const cual = 'postulaciones.error_descartar';
      setAviso({ cual, error: Texto.claveDeError(err, frase(cual)) });
      setOcupada('');
    }
  }

  return (
    <div className="fondo-superficie borde-tarjeta redondeo-16 p-16 mb-12">
      <div className="flex alinear-centro gap-12">
        {foto
          ? <img src={foto} alt="" className="pos-redondel pos-foto" />
          : <div className="pos-redondel pos-inicial">{inicial}</div>}
        <div className="flex-1">
          <h5 className="m-0 texto-13 peso-700">{fila.asistente_nombre || ''}</h5>
          {linea ? <p className="m-0 texto-11 color-secundario">{linea}</p> : null}
        </div>
        {insignia ? <span className="insignia-validada">{insignia}</span> : null}
      </div>
      <p className="texto-12 mt-8 mb-4">{mensaje || frase('postulaciones.sin_mensaje')}</p>
      <p className="texto-11 color-secundario m-0 mb-8">
        {frase('postulaciones.recibida', { fecha: Texto.fechaCorta(fila.created_at) })}
      </p>
      <div className="flex gap-8">
        <button type="button" className="btn btn-primario flex-1"
          disabled={ocupada === 'contactar'} onClick={contactar}>
          {ocupada === 'contactar'
            ? frase('postulaciones.contactando')
            : (fila.conversacion_id
              ? frase('postulaciones.abrir_conversacion')
              : frase('postulaciones.contactar'))}
        </button>
        {/* Ya descartada no se vuelve a descartar. Se apaga y no se esconde: la
            postulación sigue estando y la insignia dice en qué estado quedó. */}
        <button type="button" className="btn btn-sobre-oscuro flex-1"
          disabled={!!fila.descartada_el || ocupada === 'descartar'}
          onClick={fila.descartada_el ? undefined : descartar}>
          {ocupada === 'descartar'
            ? frase('postulaciones.descartando')
            : frase('postulaciones.descartar')}
        </button>
      </div>
      {aviso ? (
        <p className="texto-11 m-0 mt-8 color-peligro">
          {frase(aviso.cual) + ' ' + frase(aviso.error)}
        </p>
      ) : null}
    </div>
  );
}
