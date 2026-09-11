/* ===================================================
   LAS VERIFICACIONES DEL LEGAJO, PAPEL POR PAPEL

   Es lo único que la Prestadora controla de un Asistente: **quién entra**. No
   reparte trabajo, no mira la fichada y no mira el reporte de cuidado. Mira los
   papeles, y los marca de a uno.

   Va antes de la resolución a propósito: primero se marca cada papel y recién
   después se otorga el aval.

   **Ni una palabra escrita acá adentro.** Los rótulos salen del catálogo de
   frases y las dos listas —los papeles y sus estados— de los vocabularios de la
   base, que es lo que hace que el bloque exista también en `en` y en `pt-BR`.

   **Los cuatro estados**: cargando y error en el cartel propio, la rama de «el
   catálogo no trajo ninguna verificación» dicha aparte, y listo con la lista.
   El cartel es propio y no el de la tabla de arriba por lo de siempre: dos
   cargas que corren casi a la vez sobre un cartel único se borran entre ellas.

   **Y el cartel tiene dos capas.** Abajo, lo que dice la carga; arriba, lo que
   dice el guardado de un papel. Se dibuja el de arriba cuando hay, y si no el
   de abajo. Escrito con una sola caja, la carga le borraba al guardado el
   «guardado» apenas React volvía a dibujar.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { useVocabulario } from '#comun/formularios/useVocabulario.js';
import { Catalogo } from '#comun/frases/lector.js';
import Cartel from './Cartel.jsx';

/* El valor de fábrica de la columna. Un papel del que la base no tiene ninguna
   fila vale «sin presentar», así el legajo recién llegado se ve completo —los
   siete papeles, todos sin presentar— en vez de vacío. */
const SIN_PRESENTAR = 'pendiente';

export default function Verificaciones({ base, caregiverId, token }) {
  const { frase } = useFrases();

  const papeles = useVocabulario('verificacion');
  const estadosDelPapel = useVocabulario('estado_verificacion');

  const [estadoMarcadas, setEstadoMarcadas] = useState('cargando');
  const [marcadas, setMarcadas] = useState({});
  const [elegido, setElegido] = useState({});
  const [guardando, setGuardando] = useState(null);
  const [cartelGuardado, setCartelGuardado] = useState(null);

  useEffect(() => {
    let vigente = true;
    setEstadoMarcadas('cargando');
    setMarcadas({});
    setElegido({});
    setCartelGuardado(null);

    (async () => {
      try {
        const filas = await base.ClienteDatos.verificacionesDeAspirante(caregiverId);
        if (!vigente) return;
        const porTipo = {};
        (filas || []).forEach((f) => { porTipo[f.tipo] = f; });
        setMarcadas(porTipo);
        setEstadoMarcadas('listo');
      } catch (err) {
        console.error('Panel de la Prestadora, verificaciones del legajo:', err);
        if (vigente) setEstadoMarcadas('error');
      }
    })();

    return () => { vigente = false; };
  }, [base, caregiverId, token]);

  /* El cartel de la carga, con la misma precedencia que tenía el guion: primero
     lo que falló, después lo que todavía viaja, después la rama de «el catálogo
     no trajo nada», y recién entonces nada. */
  const cartelDeCarga =
    (papeles.estado === 'error' || estadosDelPapel.estado === 'error' || estadoMarcadas === 'error')
      ? { tono: 'critico', clave: 'panel.verificaciones_error' }
      : (papeles.estado === 'cargando' || estadosDelPapel.estado === 'cargando'
        || estadoMarcadas === 'cargando')
        ? { tono: 'info', clave: 'panel.verificaciones_cargando' }
        : (!papeles.items.length || !estadosDelPapel.items.length)
          ? { tono: 'atencion', clave: 'panel.verificaciones_sin_catalogo' }
          : null;

  const cartel = cartelGuardado || cartelDeCarga;

  /* «Todo botón que dispara una operación se apaga»: acá el que dispara es el
     desplegable, así que el que se apaga es él.

     Y si la base rechaza el cambio, el desplegable vuelve al valor que tenía.
     Dejarlo mostrando lo que no se guardó es peor que no haberlo movido: quien
     marcó se va convencido de que el papel quedó comprobado. */
  async function guardarVerificacion(tipo, nuevo, antes) {
    setElegido((antesDeTodo) => ({ ...antesDeTodo, [tipo]: nuevo }));
    setGuardando(tipo);
    setCartelGuardado({ tono: 'info', clave: 'panel.verificaciones_guardando' });

    let fila;
    try {
      fila = await base.ClienteDatos.marcarVerificacion(caregiverId, tipo, nuevo);
    } catch (err) {
      console.error('Panel de la Prestadora, marca de una verificación:', err);
      setElegido((antesDeTodo) => ({ ...antesDeTodo, [tipo]: antes }));
      setCartelGuardado({ tono: 'critico', clave: 'panel.verificaciones_error_guardar' });
      return;
    } finally {
      setGuardando(null);
    }

    /* La base contestó sin devolver la fila: el cambio no quedó escrito, y decir
       «guardado» sería mentir. Es la misma falla que la de arriba. */
    if (!fila) {
      setElegido((antesDeTodo) => ({ ...antesDeTodo, [tipo]: antes }));
      setCartelGuardado({ tono: 'critico', clave: 'panel.verificaciones_error_guardar' });
      return;
    }

    /* Lo que se muestra es lo que quedó guardado, no lo que se eligió. */
    setElegido((antesDeTodo) => ({ ...antesDeTodo, [tipo]: fila.estado }));
    setMarcadas((antesDeTodo) => ({ ...antesDeTodo, [tipo]: fila }));
    setCartelGuardado({
      tono: 'exito',
      clave: 'panel.verificaciones_guardado',
      huecos: {
        papel: Catalogo.etiquetaSiExiste('verificacion', tipo),
        estado: Catalogo.etiquetaSiExiste('estado_verificacion', fila.estado)
      }
    });
  }

  return (
    <div style={{
      background: 'var(--superficie-hundida)', padding: '16px', borderRadius: '12px',
      margin: '16px 0', border: '1px solid var(--borde-card)'
    }}>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--texto-titulo)' }}>
        {frase('panel.verificaciones_titulo')}
      </h4>
      <p className="texto-11 color-secundario m-0 mb-12">
        {frase('panel.verificaciones_bajada')}
      </p>

      <Cartel tono={cartel && cartel.tono} clave={cartel && cartel.clave}
        huecos={cartel && cartel.huecos} />

      <div>
        {!cartelDeCarga && papeles.items.map((papel) => {
          const fila = marcadas[papel.clave] || {};
          const guardado = elegido[papel.clave] !== undefined
            ? elegido[papel.clave] : (fila.estado || SIN_PRESENTAR);
          /* Si la base guardó un estado que el vocabulario ya no tiene, el
             desplegable se queda en blanco y desde ahí cualquier vuelta atrás
             guarda vacío. Antes que eso, se muestra el primero de la lista. */
          const valor = estadosDelPapel.items.some((e) => e.clave === guardado)
            ? guardado : estadosDelPapel.items[0].clave;

          return (
            <div
              className="flex gap-12 mb-12"
              style={{ alignItems: 'center', justifyContent: 'space-between' }}
              key={papel.clave}
            >
              <span className="texto-12 peso-700">{papeles.texto(papel)}</span>
              <span className="flex gap-12" style={{ alignItems: 'center' }}>
                {fila.verificado_el && (
                  <span className="texto-11 color-secundario">
                    {frase('panel.verificaciones_marcado_el', {
                      fecha: new Date(fila.verificado_el).toLocaleDateString(Catalogo.idioma)
                    })}
                  </span>
                )}
                <select
                  className="texto-12 redondeo-6 borde-tarjeta p-8"
                  value={valor}
                  disabled={guardando === papel.clave}
                  onChange={(ev) => guardarVerificacion(papel.clave, ev.target.value, valor)}
                >
                  {estadosDelPapel.items.map((e) => (
                    <option key={e.clave} value={e.clave}>{estadosDelPapel.texto(e)}</option>
                  ))}
                </select>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
