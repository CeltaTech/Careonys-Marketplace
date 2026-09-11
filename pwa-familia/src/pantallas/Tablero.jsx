/* ===================================================
   EL TABLERO

   Lo primero que se ve con la sesión abierta: los cuatro atajos y los
   Asistentes que la Prestadora publicó.

   Los Asistentes salen de `directorio`, la misma vista que el directorio de la
   web: gente con el legajo validado por la Prestadora, con la publicación
   autorizada y con los papeles que frenan la publicación comprobados. Antes
   salían de la tabla del personal entero, que no distingue una cosa de la otra.

   La lista se pide una sola vez, al arrancar la aplicación, y no cada vez que
   se vuelve acá: el programa avisa cuándo pedirla con un número que sube, y ese
   número sube una vez sola, cuando la Prestadora ya quedó resuelta. Si la
   Prestadora no se resolvió, no se pide nada, igual que antes.

   Los cuatro estados están completos, y el error se guarda como clave del
   catálogo y no como texto ya escrito: así cambiar de idioma con el aviso a la
   vista lo cambia también a él.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Catalogo, Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';
import BarraDeAbajo from './BarraDeAbajo.jsx';

export default function Tablero({ activa, pedido, navegar, alAbrirMenu }) {
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
        const traidas = await ClienteDatos.listarDirectorio();
        await Catalogo.cargar();
        if (!vigente) return;
        setAcceso(ClienteDatos);
        if (!traidas || traidas.length === 0) { setFilas([]); setEstado('vacio'); return; }
        setFilas(traidas);
        setEstado('listo');
      } catch (err) {
        if (!vigente) return;
        setClaveDelError(Texto.claveDeError(err, 'traer los Asistentes'));
        setEstado('error');
      }
    })();
    return () => { vigente = false; };
  }, [pedido, intento]);

  return (
    <div className={'app-screen pb-64' + (activa ? ' active' : '')} id="screen-dashboard">
      <div className="dashboard-header">
        <button className="btn-back texto-20" id="btn-open-menu" onClick={alAbrirMenu}>
          <i className="fas fa-bars"></i>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img src="../assets/images/logotipo.png" className="tenant-logo" style={{ height: '24px' }}
            alt={frase('asistente.logo_prestadora')} />
          <span className="tenant-name texto-14 peso-800 color-marca">{frase('comun.organizacion')}</span>
        </div>
        <div><i className="fas fa-bell texto-18 color-secundario"></i></div>
      </div>

      <div className="grid-services">
        <a className="service-btn" href="../directorio">
          <div className="icon-box fondo-azul-oscuro"><i className="fas fa-user-search"></i></div>
          <span>{frase('familia.buscar_asistente')}</span>
        </a>
        <a className="service-btn" href="../soporte-remoto">
          <div className="icon-box fondo-azul-medio"><i className="fas fa-headset"></i></div>
          <span>{frase('acompanamiento.titulo')}</span>
        </a>
        <div className="service-btn" onClick={() => navegar('reportes')}>
          <div className="icon-box" style={{ background: 'var(--verde-exito)' }}><i className="fas fa-book-medical"></i></div>
          <span>{frase('familia.tab_reportes')}</span>
        </div>
        <div className="service-btn" onClick={() => navegar('publicar')}>
          <div className="icon-box" style={{ background: 'var(--naranja-alerta)' }}><i className="fas fa-plus-circle"></i></div>
          <span>{frase('familia.nuevo_aviso')}</span>
        </div>
      </div>

      {/* Decía «Cuidadores recomendados» y no había ninguna recomendación
          detrás: son los Asistentes de la Prestadora que autorizaron
          publicarse, los mismos del directorio y en el mismo orden. */}
      <div className="section-title">
        <span>{frase('familia.asistentes')}</span>
        <a href="../directorio">{frase('familia.ver_todos')}</a>
      </div>

      {estado === 'cargando' ? (
        <div className="pwa-estado" id="rec-cargando">{frase('directorio.cargando')}</div>
      ) : null}

      {estado === 'error' ? (
        <div className="pwa-estado" id="rec-error">
          <p id="rec-error-texto">{frase(claveDelError)}</p>
          <button type="button" className="btn btn-primario" id="rec-reintentar"
            onClick={() => setIntento((cuantos) => cuantos + 1)}>
            {frase('acceso.reintentar')}
          </button>
        </div>
      ) : null}

      {estado === 'vacio' ? (
        <div className="pwa-estado" id="rec-vacio">
          <p>{frase('directorio.vacio')}</p>
          <p className="pwa-estado-bajada">{frase('directorio.vacio_bajada')}</p>
        </div>
      ) : null}

      {estado === 'listo' ? (
        <div className="horizontal-slider" id="recommended-caregivers-list">
          {filas.map((fila) => <TarjetaDeAsistente key={fila.id} fila={fila} acceso={acceso} />)}
        </div>
      ) : null}

      <div style={{ textAlign: 'center', padding: '24px 0', fontSize: '10px', color: 'var(--texto-secundario)' }}>
        <span>{frase('pie.sello_producto')}</span>{' '}
        <strong className="color-marca-acento">{frase('comun.producto')}</strong>
      </div>

      <BarraDeAbajo actual="dashboard" navegar={navegar} />
    </div>
  );
}

/* La tarjeta de cada Asistente, que antes salía del molde declarado en la
   página y se llenaba parte por parte. */
function TarjetaDeAsistente({ fila, acceso }) {
  const { frase } = useFrases();

  /* El tipo y la zona son claves guardadas; su texto sale del catálogo. */
  const tipo = Catalogo.etiquetaSiExiste('tipo_asistente', fila.profession);
  const zona = Catalogo.etiquetaSiExiste('zona', fila.zone);
  const linea = [tipo, zona].filter(Boolean).join(' · ');

  /* Sin foto va la inicial del nombre. Antes iba la foto de otra persona, que es
     peor que no mostrar ninguna. */
  const foto = acceso.urlDeFotoPublica(fila.foto);
  const inicial = (fila.full_name || '?').trim().charAt(0).toUpperCase();

  return (
    <a className="caregiver-card" href={'../perfil?id=' + encodeURIComponent(fila.id)}>
      {foto ? <img src={foto} alt="" /> : <div className="card-inicial">{inicial}</div>}
      <h5>{fila.full_name || ''}</h5>
      {linea ? <p>{linea}</p> : null}
      {/* «por hora» sale del catálogo, con la misma clave que usan las tarjetas
          del directorio: escrito acá quedaba en castellano en los tres idiomas. */}
      {fila.hourly_rate ? (
        <span className="card-precio">
          {Texto.importe(fila.hourly_rate, fila.moneda_valor_hora) + ' ' + frase('directorio.por_hora')}
        </span>
      ) : null}
    </a>
  );
}
