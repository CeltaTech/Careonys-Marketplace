/* ===================================================
   LOS TRES PRIMEROS PASOS: QUIÉN ES, QUÉ ESTUDIÓ, QUÉ SABE HACER

   Los campos se dejan sueltos —sin valor guardado del lado del programa— y se
   leen del documento al enviar, exactamente como los leía la página. No es
   comodidad: el alta termina con un `form.reset()`, que es del navegador y
   vacía lo que el navegador tiene; un campo cuyo valor guardara el programa se
   quedaría escrito después del reset, y la persona siguiente vería el legajo de
   la anterior.

   Las dos contraseñas son la única excepción, y son las dos que **tienen que**
   pasar por el campo de contraseña propio: el archivo que decide qué contraseña
   vale sale a envolver los campos apenas se carga, y un campo escrito a mano acá
   terminaría movido de lugar por debajo del programa que dibuja esta pantalla.
   Ese campo pide su valor, así que el vaciado de las dos lo hace la pantalla.
=================================================== */

import CampoDeClave from '#comun/formularios/CampoDeClave.jsx';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { SelectDelCatalogo, CasillasDelCatalogo } from './DelCatalogo.jsx';
import { Pane, Navegadores } from './Navegadores.jsx';

export default function PasosDeDatos({
  paso, irAlPaso, seguir,
  tiposDeAsistente, alCambiarProfesion,
  clave, alEscribirClave, campoClave,
  claveRepetida, alEscribirClaveRepetida, campoClaveRepetida
}) {
  const { frase } = useFrases();

  return (
    <>
      {/* PASO 1: DATOS PERSONALES Y FISCALES */}
      <Pane numero={1} paso={paso}>
        <h3 className="texto-18 peso-700 mb-16 color-titulo">
          <i className="fas fa-id-card"></i> <span>{frase('legajo.paso1_titulo')}</span>
        </h3>
        <div className="grilla grilla-2 gap-16">
          <div className="form-group">
            <label htmlFor="nombre">{frase('legajo.nombre')}</label>
            <input type="text" id="nombre" required />
          </div>
          <div className="form-group">
            <label htmlFor="dni-num">{frase('legajo.dni')}</label>
            <input type="number" id="dni-num" placeholder={frase('legajo.dni_ejemplo')} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">{frase('acceso.correo')}</label>
            <input type="email" id="email" required />
          </div>
          <div className="form-group">
            <label htmlFor="celular">{frase('legajo.celular')}</label>
            <input type="tel" id="celular" placeholder="11 2345 6789" required />
          </div>
          {/* El largo mínimo no se escribe acá: lo sabe el archivo que decide qué
              contraseña vale, y se lo pregunta el campo. */}
          <div className="form-group">
            <label htmlFor="clave">{frase('acceso.contrasena')}</label>
            <CampoDeClave
              ref={campoClave}
              id="clave" autoComplete="new-password" required
              value={clave} onChange={alEscribirClave}
            />
          </div>
          <div className="form-group">
            <label htmlFor="clave-repetida">{frase('legajo.repetir_contrasena')}</label>
            <CampoDeClave
              ref={campoClaveRepetida}
              id="clave-repetida" autoComplete="new-password" required
              value={claveRepetida} onChange={alEscribirClaveRepetida}
            />
          </div>
          <div className="form-group">
            <label htmlFor="cuit-cuil">{frase('legajo.cuit')}</label>
            <input type="number" id="cuit-cuil" placeholder={frase('legajo.cuit_ejemplo')} required />
          </div>
          <div className="form-group">
            <label htmlFor="fecha-nacimiento">{frase('legajo.nacimiento')}</label>
            <input type="date" id="fecha-nacimiento" required />
          </div>
          <div className="form-group">
            <label htmlFor="genero">{frase('legajo.genero')}</label>
            <SelectDelCatalogo id="genero" clave="genero" required />
          </div>
          <div className="form-group">
            <label htmlFor="nacionalidad">{frase('legajo.nacionalidad')}</label>
            <input type="text" id="nacionalidad" placeholder={frase('legajo.nacionalidad_ejemplo')} required />
          </div>
          <div className="form-group">
            <label htmlFor="condicion-fiscal">{frase('alta.condicion_fiscal')}</label>
            <SelectDelCatalogo id="condicion-fiscal" clave="condicion_fiscal" required />
          </div>
          <div className="form-group grilla-fila-entera">
            <label htmlFor="domicilio">{frase('legajo.domicilio')}</label>
            <input type="text" id="domicilio" placeholder={frase('alta.domicilio_ejemplo')} required />
          </div>
          {/* El rótulo, la ayuda y las casillas las arma js/zonas.js: la lista
              sale de la base y es de cada Prestadora, así que no puede estar
              escrita acá. Con la Prestadora sin lista cargada, este mismo hueco
              muestra el campo de texto libre. */}
          <div className="form-group grilla-fila-entera" id="zonas"></div>
          <div className="form-group">
            <label htmlFor="cbu-alias">{frase('legajo.cbu')}</label>
            <input type="text" id="cbu-alias" placeholder={frase('alta.cbu_ejemplo')} required />
          </div>
        </div>

        <Navegadores siguiente={2} seguir={seguir} />
      </Pane>

      {/* PASO 2: FORMACIÓN Y DOCUMENTACIÓN */}
      <Pane numero={2} paso={paso}>
        <h3 className="texto-18 peso-700 mb-16 color-titulo">
          <i className="fas fa-file-invoice"></i> <span>{frase('alta.paso2_titulo')}</span>
        </h3>

        <div className="grilla grilla-2 gap-16 mb-20">
          <div className="form-group grilla-fila-entera">
            <label htmlFor="profesion">{frase('legajo.tipo_asistente')}</label>
            {/* Este desplegable se llena de dos lados: los Tipos de Asistente del
                vocabulario y los que declaran ficha propia en el catálogo de
                fichas. Los que ya están no se vuelven a poner. */}
            <SelectDelCatalogo
              id="profesion" clave="tipo_asistente" required
              extras={tiposDeAsistente} onChange={alCambiarProfesion}
            />
          </div>
          <div className="form-group grilla-fila-entera">
            <label htmlFor="nivel-estudios">{frase('legajo.estudios')}</label>
            <SelectDelCatalogo id="nivel-estudios" clave="nivel_educativo" required />
          </div>
        </div>

        {/* CURSOS ACADÉMICOS */}
        <div className="fondo-superficie redondeo-12 p-20 borde-tarjeta mb-20">
          <h4 className="texto-14 peso-700 color-titulo mb-12">
            <i className="fas fa-graduation-cap color-azul-medio"></i>{' '}
            <span>{frase('legajo.certificaciones')}</span>
          </h4>
          <CasillasDelCatalogo
            clave="certificacion" nombre="certificacion" clase="catalogo-casilla"
            style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', fontSize: '13px' }}
          />
        </div>

        {/* CARGA DE DOCUMENTOS */}
        <div className="fondo-superficie-hover redondeo-12 p-20 borde-tarjeta mb-20">
          <h4 className="texto-14 peso-700 color-titulo mb-16">
            <i className="fas fa-shield-alt color-azul-medio"></i>{' '}
            <span>{frase('alta.seccion_foto')}</span>
          </h4>
          <div className="grilla grilla-2 gap-16">
            <div className="form-group grilla-fila-entera">
              <label className="texto-12">{frase('legajo.doc_foto')}</label>
              <input type="file" id="foto-perfil" className="texto-12" required />
            </div>
            <div className="form-group grilla-fila-entera">
              <p className="texto-12 color-secundario m-0">{frase('alta.donde_van_los_papeles')}</p>
            </div>
          </div>
        </div>

        <Navegadores anterior={1} siguiente={3} irAlPaso={irAlPaso} seguir={seguir} />
      </Pane>

      {/* PASO 3: APTITUDES Y PATOLOGÍAS */}
      <Pane numero={3} paso={paso}>
        <h3 className="texto-18 peso-700 mb-16 color-titulo">
          <i className="fas fa-clipboard-list"></i> <span>{frase('legajo.paso3_titulo')}</span>
        </h3>

        <div className="fondo-superficie redondeo-12 p-20 borde-tarjeta mb-20">
          <p className="texto-14 peso-700 color-principal mb-12">{frase('legajo.patologias')}</p>
          <CasillasDelCatalogo
            clave="patologia" nombre="patologia" clase="catalogo-casilla"
            className="grilla grilla-2 gap-12 texto-13 mb-20"
          />

          <p className="texto-14 peso-700 color-principal mb-12">{frase('legajo.tareas')}</p>
          <CasillasDelCatalogo
            clave="tarea_cuidado" nombre="tarea_cuidado" clase="catalogo-casilla"
            className="grilla grilla-2 gap-12 texto-13"
          />
        </div>

        <Navegadores anterior={2} siguiente={4} irAlPaso={irAlPaso} seguir={seguir} />
      </Pane>
    </>
  );
}
