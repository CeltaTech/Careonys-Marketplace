/* ===================================================
   EL FORMULARIO DE CONSULTA DE LAS PANTALLAS PÚBLICAS

   Cuatro pantallas preguntan lo mismo —nombre, correo, celular, motivo y si
   quiere novedades—, así que el formulario es uno solo y está acá.

   **Qué hace con la respuesta, y por qué hace eso.** Guardar una consulta
   pública contra la base exige abrirle la tabla a quien no inició sesión, y eso
   no está abierto. Entonces:

   1. Si hay sesión **y** se resolvió una Prestadora, guarda, que es el único
      caso en el que guardar puede funcionar.
   2. Si no, no intenta ni finge: ofrece el correo del producto con la consulta
      ya redactada adentro, y deja que la persona la mande.

   **Nada dice «enviado» hasta que algo se envió.** Antes tres de las cuatro
   pantallas prendían un cartel verde sin haber mandado nada a ningún lado.

   Los cuatro estados de un envío: **enviando** con el botón apagado, **error**
   dicho en la pantalla y no en la consola, **listo** cuando el guardado salió,
   y el cuarto —que acá no es «vacío» sino «no hay a dónde mandarlo»— con su
   propio cartel y el enlace de correo.

   La lógica es la misma que ya estaba escrita y medida; lo único que cambió es
   que la pantalla la dibuja React en vez de armarla a mano.
=================================================== */

import { useState } from 'react';
import { useFrases } from '../frases/ProveedorDeFrases.jsx';
import { useVocabulario } from './useVocabulario.js';
import { Identidad, Texto } from '../frases/lector.js';

const VACIO = { nombre: '', email: '', celular: '', motivo: '', novedades: 'si' };

/* Falla cerrado: ante cualquier duda contesta que no, y la consulta se va por
   correo, que es el camino que sí llega. */
async function sePuedeGuardar() {
  if (!window.ClienteDatos || !window.Sesion) return false;
  const sesion = await window.Sesion.getSession().catch(() => null);
  if (!sesion || !sesion.user) return false;
  const prestadora = await window.ClienteDatos.initTenant().catch(() => null);
  return Boolean(prestadora && prestadora.id);
}

export default function FormularioDeConsulta({ vocabulario = 'motivo_consulta', motivoFijo = '' }) {
  const { frase } = useFrases();
  const opciones = useVocabulario(vocabulario);

  const [datos, setDatos] = useState(VACIO);
  const [estado, setEstado] = useState('listo');   // listo | enviando | guardado | error | por_correo
  const [aviso, setAviso] = useState('');

  const cambiar = (campo) => (evento) =>
    setDatos((antes) => ({ ...antes, [campo]: evento.target.value }));

  const etiquetaDelMotivo = () => {
    const item = opciones.items.filter((i) => i.clave === datos.motivo)[0];
    return item ? opciones.texto(item) : '';
  };

  /* Cada renglón es «etiqueta: lo que puso», y las etiquetas salen del
     catálogo: quien la lea la va a leer en el idioma en el que la persona
     completó el formulario. */
  const redaccion = () => [
    [frase('consulta.dato_nombre'), datos.nombre],
    [frase('consulta.dato_correo'), datos.email],
    [frase('consulta.dato_celular'), datos.celular],
    [frase('consulta.dato_motivo'), etiquetaDelMotivo()],
    [frase('consulta.dato_novedades'), frase(datos.novedades === 'si' ? 'comun.si' : 'comun.no')]
  ].filter(([, valor]) => valor).map(([etiqueta, valor]) => etiqueta + ': ' + valor).join('\n');

  const direccionDeCorreo = () => (Identidad && Identidad.datos ? Identidad.datos.contacto : '');

  const enlaceDeCorreo = () =>
    'mailto:' + direccionDeCorreo()
    + '?subject=' + encodeURIComponent(frase('consulta.asunto'))
    + '&body=' + encodeURIComponent(redaccion());

  const faltaAlgo = () =>
    !datos.nombre.trim() || !datos.celular.trim() || !datos.motivo
    || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.email.trim());

  async function enviar(evento) {
    evento.preventDefault();
    if (faltaAlgo()) {
      setEstado('error');
      setAviso(frase('aviso.faltan_campos'));
      return;
    }

    setEstado('enviando');
    setAviso(frase('consulta.enviando'));

    try {
      if (await sePuedeGuardar()) {
        await window.ClienteDatos.crearAvisoFamilia({
          paciente: datos.nombre,
          motivoConsulta: datos.motivo || motivoFijo,
          horarios: 'A coordinar',
          contacto: { nombre: datos.nombre, email: datos.email, celular: datos.celular }
        });
        setEstado('guardado');
        setAviso(frase('consulta.enviada'));
        setDatos(VACIO);
      } else {
        setEstado('por_correo');
        setAviso(frase('consulta.no_se_recibe_aca'));
      }
    } catch (err) {
      // El texto crudo de la base nombra tablas y restricciones: queda en la
      // consola, y a la pantalla va la frase del catálogo.
      setEstado('error');
      setAviso(Texto.mensajeDeError(err, 'dejar la consulta'));
    }
  }

  const color =
    estado === 'error' ? 'var(--rojo-peligro)'
      : estado === 'guardado' ? 'var(--verde-exito-texto)'
        : '';

  return (
    <form onSubmit={enviar} noValidate>
      <div className="form-group">
        <label htmlFor="consulta-nombre">{frase('consulta.dato_nombre')}</label>
        <input id="consulta-nombre" type="text" value={datos.nombre} onChange={cambiar('nombre')} />
      </div>
      <div className="form-group">
        <label htmlFor="consulta-correo">{frase('consulta.dato_correo')}</label>
        <input id="consulta-correo" type="email" value={datos.email} onChange={cambiar('email')} />
      </div>
      <div className="form-group">
        <label htmlFor="consulta-celular">{frase('consulta.dato_celular')}</label>
        <input id="consulta-celular" type="tel" value={datos.celular} onChange={cambiar('celular')} />
      </div>

      <div className="form-group">
        <label htmlFor="consulta-motivo">{frase('acompanamiento.campo_situacion')}</label>
        <select
          id="consulta-motivo"
          value={datos.motivo}
          onChange={cambiar('motivo')}
          disabled={opciones.estado === 'cargando'}
        >
          <option value="">
            {opciones.estado === 'cargando' ? frase('catalogo.cargando')
              : opciones.estado === 'error' ? frase('catalogo.error')
                : frase('acompanamiento.elija_opcion')}
          </option>
          {opciones.items.map((item) => (
            <option key={item.clave} value={item.clave}>{opciones.texto(item)}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>{frase('acompanamiento.campo_novedades')}</label>
        <div className="radio-group">
          <label>
            <input type="radio" name="novedades" value="si"
              checked={datos.novedades === 'si'} onChange={cambiar('novedades')} />
            {' '}<span>{frase('comun.si')}</span>
          </label>
          <label>
            <input type="radio" name="novedades" value="no"
              checked={datos.novedades === 'no'} onChange={cambiar('novedades')} />
            {' '}<span>{frase('comun.no')}</span>
          </label>
        </div>
      </div>

      <button type="submit" className="btn btn-secundario" disabled={estado === 'enviando'}>
        {estado === 'enviando' ? frase('consulta.enviando') : frase('acompanamiento.enviar')}
      </button>

      {aviso && (
        <div className="consulta-respuesta" style={color ? { color } : undefined} role="status">
          {aviso}
          {estado === 'por_correo' && direccionDeCorreo() && (
            <>
              <br />
              <a href={enlaceDeCorreo()} className="bloque-en-linea mt-12 peso-700">
                {frase('consulta.escribir_correo')} ({direccionDeCorreo()})
              </a>
            </>
          )}
        </div>
      )}
    </form>
  );
}
