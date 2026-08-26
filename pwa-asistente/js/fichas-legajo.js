/* ===================================================
   FICHAS REPETIBLES DEL LEGAJO DEL ASISTENTE
   Desarrollado por CeltaTech.
   Lee data/catalogo-fichas.json y data/catalogo-vocabularios.json
   y dibuja los formularios de Matrícula, Estudios, Experiencia laboral
   y Referencias. «todo botón que dispara una operación se apaga».1 del CLAUDE.md: los formularios se declaran,
   no se dibujan — ninguna etiqueta ni opción de este archivo se escribe
   a mano en el HTML.
=================================================== */

const FichasLegajo = {
  fichas: null,
  vocabularios: null,
  idioma: 'es-AR',
  contadores: {},

  async cargar() {
    const [fichasRes, vocabRes] = await Promise.all([
      fetch('data/catalogo-fichas.json').then(r => r.json()),
      fetch('data/catalogo-vocabularios.json').then(r => r.json())
    ]);
    this.fichas = fichasRes.fichas;
    this.vocabularios = vocabRes.vocabularios;
  },

  requiereMatricula(claveProfesion) {
    const items = (this.vocabularios.tipo_asistente || {}).items || [];
    const item = items.find(i => i.clave === claveProfesion);
    return !!(item && item.requiere_matricula);
  },

  _opciones(claveVocabulario) {
    const voc = this.vocabularios[claveVocabulario];
    return voc ? voc.items : [];
  },

  opcionesVocabulario(claveVocabulario) {
    return this._opciones(claveVocabulario);
  },

  _textoCampo(campo) {
    return campo[this.idioma] || campo['es-AR'];
  },

  // El nombre visible de una ficha, en el idioma que corresponda. Si falta la
  // traducción se cae al es-AR: mejor la palabra en otro idioma que un título
  // en blanco.
  _tituloFicha(tipoFicha) {
    const ficha = this.fichas[tipoFicha] || {};
    const textos = ficha[this.idioma] || ficha['es-AR'] || {};
    return textos.titulo || tipoFicha;
  },

  _valorCampo(bloque, clave) {
    const el = bloque.querySelector(`[data-campo="${clave}"]`);
    if (!el) return null;
    return el.type === 'checkbox' ? el.checked : el.value;
  },

  // Evalua las condiciones que el catalogo declara: "en_curso == true",
  // "puesto == 'otro'", "respalda_perfil.requiere_matricula == true".
  _condicionCumple(bloque, expresion) {
    const m = String(expresion).match(/^\s*([a-z_]+)(?:\.([a-z_]+))?\s*==\s*(.+?)\s*$/i);
    if (!m) return false;
    const clave = m[1], propiedad = m[2], crudo = m[3];
    const esperado = crudo === 'true' ? true
      : crudo === 'false' ? false
      : crudo.replace(/^['"]|['"]$/g, '');
    let valor = this._valorCampo(bloque, clave);
    if (propiedad) {
      const campo = this.fichas[bloque.dataset.ficha].campos.find(c => c.clave === clave);
      const item = campo ? this._opciones(campo.vocabulario).find(i => i.clave === valor) : null;
      valor = item ? !!item[propiedad] : false;
    }
    return valor === esperado;
  },

  // Un campo que no corresponde no se pide: deja de ser obligatorio y se esconde.
  _aplicarCondiciones(bloque) {
    const tipoFicha = bloque.dataset.ficha;
    this.fichas[tipoFicha].campos.forEach(campo => {
      if (!campo.obligatorio_si && !campo.no_obligatorio_si) return;
      const grupo = bloque.querySelector(`.form-group[data-clave="${campo.clave}"]`);
      const el = bloque.querySelector(`[data-campo="${campo.clave}"]`);
      if (!grupo || !el) return;
      let obligatorio, visible;
      if (campo.no_obligatorio_si) {
        const seCumple = this._condicionCumple(bloque, campo.no_obligatorio_si);
        obligatorio = !seCumple;
        visible = !seCumple;
      } else {
        const seCumple = this._condicionCumple(bloque, campo.obligatorio_si);
        obligatorio = seCumple;
        // Comparar contra un valor literal describe cuando el campo tiene sentido;
        // mirar una propiedad del vocabulario solo dice cuando pasa a ser obligatorio.
        visible = /==\s*['"]/.test(campo.obligatorio_si) ? seCumple : true;
      }
      grupo.style.display = visible ? '' : 'none';
      if (obligatorio) el.setAttribute('required', ''); else el.removeAttribute('required');
      if (!visible) {
        if (el.type === 'checkbox') el.checked = false; else el.value = '';
        el.style.outline = '';
      }
    });
  },

  _inputCampo(tipoFicha, campo, indice) {
    // El catálogo termina siendo una tabla que carga gente: lo que sale de él
    // entra en la pantalla como texto, nunca como marcado.
    const id = Texto.escapar(`ficha-${tipoFicha}-${campo.clave}-${indice}`);
    const clave = Texto.escapar(campo.clave);
    const req = campo.obligatorio ? 'required' : '';
    if (campo.tipo === 'texto' || campo.tipo === 'telefono') {
      return `<input type="${campo.tipo === 'telefono' ? 'tel' : 'text'}" id="${id}" data-campo="${clave}" maxlength="${Texto.escapar(campo.maximo || 255)}" ${req} />`;
    }
    if (campo.tipo === 'texto_largo') {
      return `<textarea id="${id}" data-campo="${clave}" maxlength="${Texto.escapar(campo.maximo || 1000)}" ${req} style="width:100%;min-height:60px;"></textarea>`;
    }
    if (campo.tipo === 'fecha') {
      return `<input type="date" id="${id}" data-campo="${clave}" ${req} />`;
    }
    if (campo.tipo === 'anio') {
      return `<input type="number" id="${id}" data-campo="${clave}" min="1950" max="2100" ${req} />`;
    }
    if (campo.tipo === 'mes_anio') {
      return `<input type="month" id="${id}" data-campo="${clave}" ${req} />`;
    }
    if (campo.tipo === 'casilla') {
      return `<input type="checkbox" id="${id}" data-campo="${clave}" style="width:18px;height:18px;" />`;
    }
    if (campo.tipo === 'archivo') {
      return `<input type="file" id="${id}" data-campo="${clave}" accept=".jpg,.jpeg,.png,.pdf" ${req} />`;
    }
    if (campo.tipo === 'lista') {
      const opciones = this._opciones(campo.vocabulario)
        .map(o => `<option value="${Texto.escapar(o.clave)}">${Texto.escapar(o[this.idioma] || o['es-AR'])}</option>`).join('');
      return `<select id="${id}" data-campo="${clave}" ${req}><option value="">— Seleccionar —</option>${opciones}</select>`;
    }
    if (campo.tipo === 'lista_multiple') {
      const vocs = Array.isArray(campo.vocabulario) ? campo.vocabulario : [campo.vocabulario];
      const opciones = vocs.flatMap(v => this._opciones(v))
        .map(o => `<label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:400;"><input type="checkbox" data-campo="${clave}" value="${Texto.escapar(o.clave)}" /> ${Texto.escapar(o[this.idioma] || o['es-AR'])}</label>`)
        .join('');
      return `<div class="lista-multiple-opciones" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px;">${opciones}</div>`;
    }
    return `<input type="text" id="${id}" data-campo="${clave}" ${req} />`;
  },

  // ¿El bloque tiene algo cargado? Un campo escrito, una opción elegida que no sea
  // la vacía, una casilla marcada o un archivo elegido.
  _tieneAlgoCargado(bloque) {
    return Array.from(bloque.querySelectorAll('input, select, textarea')).some((campo) => {
      if (campo.type === 'checkbox' || campo.type === 'radio') return campo.checked;
      if (campo.type === 'file') return campo.files && campo.files.length > 0;
      return String(campo.value || '').trim() !== '';
    });
  },

  _bloqueHTML(tipoFicha, indice) {
    const ficha = this.fichas[tipoFicha];
    const camposHTML = ficha.campos.map(campo => {
      const t = this._textoCampo(campo);
      const esCasilla = campo.tipo === 'casilla';
      const idCampo = Texto.escapar(`ficha-${tipoFicha}-${campo.clave}-${indice}`);
      return `<div class="form-group" data-clave="${Texto.escapar(campo.clave)}" style="margin-bottom:12px;${esCasilla ? 'display:flex;align-items:center;gap:8px;' : ''}">
        ${esCasilla
          ? `${/* seguro: es marcado que arma este mismo módulo, y sus datos ya van escapados ahí */ this._inputCampo(tipoFicha, campo, indice)}<label for="${idCampo}" style="margin:0;cursor:pointer;">${Texto.escapar(t.etiqueta)}</label>`
          : `<label for="${idCampo}">${Texto.escapar(t.etiqueta)}${campo.obligatorio ? ' <span style="color:var(--rojo-peligro-texto);">*</span>' : ''}</label>${/* seguro: es marcado que arma este mismo módulo, y sus datos ya van escapados ahí */ this._inputCampo(tipoFicha, campo, indice)}`}
        ${t.ayuda ? `<p style="font-size:11px;color:var(--texto-secundario);margin:4px 0 0 0;">${Texto.escapar(t.ayuda)}</p>` : ''}
      </div>`;
    }).join('');

    const advertencia = ficha.advertencia
      ? `<p style="font-size:11.5px;color:var(--tono-atencion-texto);background:var(--tono-atencion-fondo);border-radius:8px;padding:10px;margin-bottom:12px;">${Texto.escapar(ficha.advertencia[this.idioma] || ficha.advertencia['es-AR'])}</p>`
      : '';

    return `<div class="ficha-bloque" data-ficha="${Texto.escapar(tipoFicha)}" data-indice="${indice}"
        style="background:var(--superficie-hover);border-radius:12px;padding:16px;border:1px solid var(--borde-card);margin-bottom:12px;position:relative;">
      ${advertencia}
      ${camposHTML}
      <button type="button" class="btn-quitar-ficha" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--rojo-peligro-texto);cursor:pointer;font-size:13px;">
        <i class="fas fa-times-circle"></i> Quitar</button>
    </div>`;
  },

  // Dibuja una sección de ficha (título, lista de bloques cargados, botón agregar) en el contenedor dado.
  montarSeccion(contenedorId, tipoFicha, opciones = {}) {
    const ficha = this.fichas[tipoFicha];
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    this.contadores[tipoFicha] = 0;

    const titulo = this._tituloFicha(tipoFicha);
    const tituloNuevo = (ficha[this.idioma] || ficha['es-AR']).titulo_nuevo;

    contenedor.innerHTML = `
      <h4 style="font-size:14px;font-weight:700;color:var(--texto-titulo);margin-bottom:10px;">${Texto.escapar(titulo)}</h4>
      <div class="fichas-lista" data-ficha="${Texto.escapar(tipoFicha)}"></div>
      <button type="button" class="btn btn-sobre-oscuro btn-agregar-ficha" data-ficha="${Texto.escapar(tipoFicha)}"
        style="border-color:var(--borde-card);color:var(--azul-medio-texto);font-size:12.5px;padding:8px 14px;">
        <i class="fas fa-plus"></i> ${Texto.escapar(tituloNuevo)}
      </button>
    `;

    const lista = contenedor.querySelector('.fichas-lista');
    const botonAgregar = contenedor.querySelector('.btn-agregar-ficha');

    const agregarBloque = () => {
      const indice = this.contadores[tipoFicha]++;
      const div = document.createElement('div');
      div.innerHTML = this._bloqueHTML(tipoFicha, indice);
      const bloque = div.firstElementChild;
      // «toda operación destructiva se confirma»: quitar un bloque con datos adentro borra lo que la persona
      // escribió, y desde acá no se recupera. Un bloque todavía vacío se quita sin
      // preguntar: no hay nada que perder, y preguntar por nada enseña a contestar
      // que sí sin leer, que es como después se pierde lo que sí importaba.
      bloque.querySelector('.btn-quitar-ficha').addEventListener('click', () => {
        if (this._tieneAlgoCargado(bloque)
            && !confirm('Se va a quitar este bloque con todo lo que tiene cargado. '
                        + 'No se puede deshacer.\n\n¿Confirma?')) {
          return;
        }
        bloque.remove();
      });
      bloque.addEventListener('change', () => this._aplicarCondiciones(bloque));
      bloque.addEventListener('input', () => this._aplicarCondiciones(bloque));
      lista.appendChild(bloque);
      this._aplicarCondiciones(bloque);
      return bloque;
    };

    botonAgregar.addEventListener('click', () => agregarBloque());

    if (opciones.obligatoriaAlMontar) {
      const bloque = agregarBloque();
      const primerCampo = bloque.querySelector('[data-campo]');
      if (primerCampo) primerCampo.focus();
    }
  },

  // Recolecta los datos cargados en una sección: un array de objetos, uno por bloque agregado.
  recolectar(contenedorId, tipoFicha) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return [];
    const ficha = this.fichas[tipoFicha];
    const bloques = Array.from(contenedor.querySelectorAll('.ficha-bloque'));
    return bloques.map(bloque => {
      const datos = {};
      ficha.campos.forEach(campo => {
        if (campo.tipo === 'lista_multiple') {
          datos[campo.clave] = Array.from(bloque.querySelectorAll(`[data-campo="${campo.clave}"]:checked`)).map(cb => cb.value);
          return;
        }
        const el = bloque.querySelector(`[data-campo="${campo.clave}"]`);
        if (!el) return;
        if (campo.tipo === 'casilla') {
          datos[campo.clave] = el.checked;
        } else if (campo.tipo === 'archivo') {
          datos[campo.clave] = el.files && el.files[0] ? el.files[0] : null;
        } else if (campo.tipo === 'mes_anio') {
          // La base guarda una fecha; del mes se toma el dia 1.
          datos[campo.clave] = el.value ? `${el.value}-01` : null;
        } else if (campo.tipo === 'anio') {
          datos[campo.clave] = el.value ? parseInt(el.value, 10) : null;
        } else {
          datos[campo.clave] = el.value ? el.value : null;
        }
      });
      return datos;
    });
  },

  // Sube los archivos de matrícula y de estudio y deja en cada fila el camino
  // adentro del depósito, nunca el archivo: una fila con un `File` adentro no
  // entra en ninguna tabla, y la columna se llama `archivo_url`.
  //
  // Está acá y no en cada pantalla porque las dos altas —el portal y la
  // aplicación del teléfono— tienen que subirlos al mismo lugar y guardar el
  // mismo camino («ningún patrón repetido sin punto único de verdad»).
  //
  // Devuelve la lista de los que no subieron, para que quien llama avise una
  // sola vez y sin frenar el resto del alta: un archivo que no sube y no avisa
  // es peor que uno que no se cargó, porque la persona se va creyendo que
  // entregó el papel.
  async subirArchivos(legajo, carpeta, deposito = 'documentos-cuidadores') {
    const fallados = [];
    const porClave = { matriculas: 'matricula', estudios: 'estudio' };

    for (const clave of Object.keys(porClave)) {
      const filas = legajo[clave] || [];
      for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        if (!('archivo' in fila)) continue;
        const archivo = fila.archivo;
        delete fila.archivo;
        fila.archivo_url = null;
        if (!archivo) continue;
        const extension = (archivo.name.split('.').pop() || 'dat').toLowerCase();
        try {
          fila.archivo_url = await Sesion.uploadFile(
            deposito, `${carpeta}/${clave}_${i}.${extension}`, archivo
          );
        } catch (errArchivo) {
          console.error('Legajo, ' + clave + ' ' + i + ':', errArchivo);
          fallados.push({
            nombre: 'el archivo de «' + this._tituloFicha(porClave[clave]) + '»',
            motivo: Texto.mensajeDeError(errArchivo)
          });
        }
      }
    }
    return fallados;
  },

  // Valida los bloques cargados de una sección. Devuelve true/false y marca en rojo lo que falte.
  validarSeccion(contenedorId, tipoFicha) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return true;
    let valido = true;
    contenedor.querySelectorAll('.ficha-bloque [required]').forEach(campo => {
      const grupo = campo.closest('.form-group');
      if (grupo && grupo.style.display === 'none') return;
      const vacio = campo.type === 'file' ? (!campo.files || campo.files.length === 0)
        : campo.type === 'checkbox' ? false
        : !campo.value || !String(campo.value).trim();
      if (vacio) {
        valido = false;
        campo.style.outline = '2px solid var(--rojo-peligro)';
        campo.addEventListener('input', () => { campo.style.outline = ''; }, { once: true });
        campo.addEventListener('change', () => { campo.style.outline = ''; }, { once: true });
      }
    });
    return valido;
  }
};

window.FichasLegajo = FichasLegajo;
