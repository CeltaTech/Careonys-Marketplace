/* ===================================================
   PASO 1 — QUIÉN ES Y DÓNDE ESTÁ

   Los datos personales y fiscales, la contraseña con que va a entrar, y el
   hueco de las zonas.

   **La contraseña se pregunta, como en cualquier alta.** Hasta que se agregó,
   esta pantalla creaba la cuenta con el número de documento, que está escrito
   tres campos más arriba y lo ve todo el que audita el legajo. Qué contraseña
   vale no se decide acá: el campo trae su propio botón de mostrar y su largo
   mínimo del único archivo que lo sabe.

   **Las zonas son un hueco vacío a propósito.** La lista es de cada Prestadora
   y sale de la base, así que no puede estar escrita en esta pantalla; y cuando
   la Prestadora todavía no cargó ninguna, en ese mismo hueco aparece un campo
   de texto libre. Cuál de las dos formas corresponde lo decide el módulo, que
   es el mismo que usa el portal.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import CampoDeClave from '#comun/formularios/CampoDeClave.jsx';
import { SelectDelCatalogo } from '#comun/formularios/DelCatalogo.jsx';

export default function PasoUno({ activo, irA, campoDeClave }) {
  const { frase } = useFrases();

  return (
    <div className={activo ? 'wpane active' : 'wpane'} id="wp1">
      <h3><i className="fas fa-id-card"></i> <span>{frase('legajo.paso1_titulo')}</span></h3>
      <div className="wgrid-2">
        <div className="wfield wgrid-2-full">
          <label>{frase('legajo.nombre')}</label>
          <input type="text" id="w-nombre" required />
        </div>
        <div className="wfield">
          <label>{frase('legajo.dni')}</label>
          <input type="number" id="w-dni" placeholder={frase('legajo.dni_ejemplo')} required />
        </div>
        <div className="wfield">
          <label>{frase('legajo.cuit')}</label>
          <input type="number" id="w-cuit" placeholder={frase('legajo.cuit_ejemplo')} required />
        </div>
        <div className="wfield">
          <label>{frase('acceso.correo')}</label>
          <input type="email" id="w-email" required />
        </div>
        <div className="wfield wgrid-2-full">
          <label>{frase('acceso.contrasena')}</label>
          <CampoDeClave id="w-clave" ref={campoDeClave} autoComplete="new-password" required />
        </div>
        <div className="wfield wgrid-2-full">
          <label>{frase('legajo.repetir_contrasena')}</label>
          <CampoDeClave id="w-clave-repetida" autoComplete="new-password" required />
        </div>
        <div className="wfield">
          <label>{frase('legajo.celular')}</label>
          {/* El ejemplo de celular está escrito acá adentro, en castellano y con
              formato argentino, y no sale del catálogo como los otros cinco. */}
          <input type="tel" id="w-celular" placeholder={frase('legajo.celular_ejemplo')} required />
        </div>
        <div className="wfield">
          <label>{frase('legajo.nacimiento')}</label>
          <input type="date" id="w-fecha-nac" required />
        </div>
        <div className="wfield">
          <label>{frase('legajo.genero')}</label>
          <SelectDelCatalogo id="w-genero" clave="genero" required />
        </div>
        <div className="wfield">
          <label>{frase('legajo.nacionalidad')}</label>
          <input type="text" id="w-nac" placeholder={frase('legajo.nacionalidad_ejemplo')} required />
        </div>
        <div className="wfield wgrid-2-full">
          <label>{frase('legajo.domicilio')}</label>
          <input type="text" id="w-domicilio" placeholder={frase('legajo.domicilio_ejemplo')} required />
        </div>
        <div className="wfield wgrid-2-full" id="zonas"></div>
        <div className="wfield">
          <label>{frase('legajo.cbu')}</label>
          <input type="text" id="w-cbu" placeholder={frase('legajo.cbu_ejemplo')} required />
        </div>
      </div>
      <div className="wnav">
        <button type="button" className="wbtn-next" onClick={() => irA(2)}>
          <span>{frase('legajo.siguiente')}</span> <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
}
