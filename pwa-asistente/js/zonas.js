/* ===================================================
   ZONAS DE COBERTURA — dónde acepta trabajar quien se postula

   Antes esto era un `<select>` de una sola opción con veinte lugares del Área
   Metropolitana escritos en `data/catalogo-vocabularios.json`. Tenía tres
   problemas, y el tercero es el que decide la forma de este archivo: quien
   trabaja en dos lugares tenía que elegir uno; las regiones y los barrios se
   mostraban mezclados en el mismo nivel; y la lista era argentina, así que el
   producto le mostraba Palermo y Quilmes a una Prestadora de Salta.

   **La lista dejó de ser del producto y pasó a ser de cada Prestadora**
   (migración 0035). El Área Metropolitana no es un caso especial escrito acá
   adentro: es simplemente lo que tienen cargado las Prestadoras ficticias de
   Buenos Aires.

   **Y el modo no se elige: se deduce.** Si la Prestadora tiene zonas cargadas
   se muestra la lista para tildar; si no tiene ninguna, se muestra un campo
   donde la persona escribe con sus palabras dónde puede trabajar. Por eso el
   estado **vacío** de este módulo no es un cartel de disculpa: es el otro
   camino, y funciona.

   Cómo se usa: la pantalla pone un contenedor vacío y lo declara.

       <div id="zonas"></div>

       await Zonas.montar('zonas');

   Y al enviar el formulario:

       const zonas = Zonas.recolectar('zonas');
       // → { zonas: ['uuid…', 'uuid…'], texto: '' }
       // o  { zonas: [], texto: 'El centro y las localidades del sur' }

   QUÉ SIGNIFICA TILDAR UNA REGIÓN, Y POR QUÉ NO ES LO MISMO QUE TILDAR TODOS
   SUS MUNICIPIOS
   «Trabajo en todo el Oeste» y «trabajo en Morón y en Ramos Mejía» son dos
   respuestas distintas, y la diferencia se nota el día que la Prestadora agrega
   un municipio nuevo: la primera lo incluye y la segunda no. Así que una región
   tildada se guarda como **una fila**, la suya, y no como la lista de sus
   municipios.

   De ahí sale el comportamiento de la pantalla, que si no sería ambiguo: con la
   región tildada sus municipios se ven tildados y **quedan apagados**, porque
   ya están incluidos y tildarlos aparte no significaría nada distinto. Para
   elegir municipios sueltos hay que destildar la región, y entonces la región
   se muestra a medias —ni tildada ni vacía— para que se vea de un vistazo que
   ahí adentro hay algo elegido.

   EN QUÉ IDIOMA SALEN LOS NOMBRES
   Los rótulos, la ayuda y los mensajes son texto del producto y salen del
   catálogo en los tres idiomas. **Los nombres de las zonas no**: son un dato de
   un cliente, como el nombre de una persona. La tabla guarda además una `clave`
   opcional, y cuando la trae —porque esa zona es una de las que el producto ya
   conoce— el nombre se traduce con el vocabulario `zona`; cuando no la trae, se
   muestra tal como lo escribió la Prestadora.

   POR QUÉ LA LISTA SE PIDE SIN SESIÓN
   El formulario de incorporación lo completa alguien que todavía no tiene
   cuenta. La tabla `zonas_cobertura` no se lee sin sesión, así que la lista
   entra por `zonas_de(p_slug)`, la misma clase de puerta que la migración 0021
   abrió para la marca y el directorio: exige el nombre corto de una Prestadora
   y por eso no puede devolver las zonas de todas.
=================================================== */

(function () {
  'use strict';

  const IDIOMA_POR_DEFECTO = 'es-AR';

  // Los cuatro estados, dichos una sola vez y con el texto del catálogo. Son
  // funciones y no cadenas porque el idioma se elige después de que este
  // archivo se leyó, y una cadena guardada ahora se queda con el de entonces.
  const MENSAJES = {
    cargando: () => Catalogo.frase('alta.zonas_cargando'),
    error: (err) => Texto.mensajeDeError(err, 'cargar las zonas de cobertura')
  };

  let promesa = null;
  let lista = null;

  // El único punto que sabe de dónde salen las zonas.
  async function _traer() {
    if (typeof window === 'undefined' || !window.ClienteDatos) {
      throw new Error('Las zonas de cobertura necesitan el cliente de datos');
    }
    const filas = await window.ClienteDatos.zonasDePrestadora();
    return Array.isArray(filas) ? filas : [];
  }

  // Un cartel legible en el lugar donde iba el campo. Una pantalla que se queda
  // vacía no avisa de nada, y la persona cree que el campo no existe.
  function _avisar(contenedor, texto, err) {
    if (err) console.error('Zonas:', err);
    contenedor.textContent = '';
    const p = document.createElement('p');
    p.className = 'gd-aviso';
    p.style.cssText = 'font-size:12.5px;color:var(--texto-secundario);margin:0;';
    p.textContent = texto;
    contenedor.appendChild(p);
  }

  // El rótulo y la ayuda de un campo, con la misma estructura en los dos
  // caminos. El aspecto es de cada pantalla; acá sólo van los nombres de clase.
  function _rotulo(contenedor, idCampo, etiqueta, ayuda) {
    const label = document.createElement('label');
    label.setAttribute('for', idCampo);
    label.textContent = etiqueta;
    contenedor.appendChild(label);

    if (ayuda) {
      const p = document.createElement('p');
      p.className = 'gd-pregunta-ayuda';
      p.textContent = ayuda;
      contenedor.appendChild(p);
    }
  }

  const Zonas = {

    // El idioma no lo guarda este módulo: lo pregunta. `js/catalogo.js` lo
    // resuelve una sola vez por página en `idiomaDelEntorno()`, y una segunda
    // copia acá es exactamente lo que dejaba media pantalla en un idioma y
    // media en otro. Se cae al de omisión sólo mientras el catálogo no llegó.
    get idioma() {
      return (typeof window !== 'undefined' && window.Catalogo && window.Catalogo.idioma)
        || IDIOMA_POR_DEFECTO;
    },

    // Trae la lista una sola vez por página, aunque la pidan diez veces.
    cargar() {
      if (!promesa) {
        promesa = _traer().then((filas) => { lista = filas; return filas; });
      }
      return promesa;
    },

    // El nombre visible de una zona. Con `clave` lo traduce el vocabulario
    // `zona`; sin ella se muestra como lo escribió la Prestadora. Requiere que
    // el catálogo ya esté cargado, y si no lo está devuelve el nombre crudo,
    // que es lo correcto: mejor el nombre en un idioma que el hueco.
    nombreDe(zona) {
      if (!zona) return '';
      if (!zona.clave || typeof window === 'undefined' || !window.Catalogo) return zona.nombre || '';
      try {
        const item = Catalogo.items('zona').filter((i) => i.clave === zona.clave)[0];
        return (item && Catalogo.texto(item)) || zona.nombre || '';
      } catch (err) {
        // El vocabulario todavía no llegó. No es un fallo de este campo.
        return zona.nombre || '';
      }
    },

    // ── Cómo se dicen las zonas de alguien que ya contestó ────────────────
    // El directorio y el perfil muestran lo mismo con distinto detalle, así que
    // las dos formas viven acá y no repetidas en las dos pantallas. Las dos
    // reciben la fila tal como la devuelve `directorio` —con `zonas`,
    // `zonas_texto` y la vieja `zone`— y devuelven texto listo para escribir.
    //
    // **Los tres casos, en el mismo orden en los dos:** tildó zonas de la lista
    // de su Prestadora; no había lista y escribió dónde trabaja; o el legajo es
    // anterior a la migración 0035 y sólo tiene `zone`. El último es el
    // respaldo y no debería quedar ninguno, pero borrarlo sería apostar a que
    // no queda ninguno.

    // Para la tarjeta: las regiones, que es lo que se lee de un vistazo. Quien
    // tildó tres municipios del Oeste cubre el Oeste, y eso se dice con una
    // palabra en vez de con tres.
    resumen(fila, tope) {
      if (!fila) return '';
      const cuantasCaben = tope || 3;
      const zonas = Array.isArray(fila.zonas) ? fila.zonas : [];

      if (zonas.length === 0) {
        if (fila.zonas_texto) return fila.zonas_texto;
        return this._respaldo(fila);
      }

      // Una región aparece una sola vez aunque la persona haya tildado ocho
      // municipios de adentro.
      const regiones = [];
      zonas.forEach((z) => {
        const nombre = this.nombreDe({ clave: z.region_clave, nombre: z.region_nombre });
        if (nombre && regiones.indexOf(nombre) === -1) regiones.push(nombre);
      });

      if (regiones.length <= cuantasCaben) return regiones.join(' · ');
      const faltan = regiones.length - cuantasCaben;
      const y = this._frase('directorio.zonas_y_mas', { cuantas: faltan });
      return regiones.slice(0, cuantasCaben).join(' · ') + (y ? ' · ' + y : '');
    },

    // Para el perfil: todo lo que tildó, agrupado por región. Una región
    // tildada entera se dice con su nombre y nada más, porque eso es lo que
    // contestó: «trabajo en todo el Oeste» no es la lista de sus municipios.
    detalle(fila) {
      if (!fila) return [];
      const zonas = Array.isArray(fila.zonas) ? fila.zonas : [];
      if (zonas.length === 0) {
        const suelta = fila.zonas_texto || this._respaldo(fila);
        return suelta ? [{ region: '', partes: [suelta] }] : [];
      }

      const grupos = [];
      zonas.forEach((z) => {
        const region = this.nombreDe({ clave: z.region_clave, nombre: z.region_nombre });
        let grupo = grupos.filter((g) => g.region === region)[0];
        if (!grupo) { grupo = { region: region, partes: [] }; grupos.push(grupo); }
        // La región entera no se lista adentro de sí misma: alcanza con que el
        // grupo lleve su nombre, y agregarla dejaría «Zona Oeste: Zona Oeste».
        if (!z.es_region) grupo.partes.push(this.nombreDe(z));
      });
      return grupos;
    },

    // El legajo viejo, que sólo tiene la zona única de antes de la 0035.
    _respaldo(fila) {
      if (!fila.zone || typeof window === 'undefined' || !window.Catalogo) return '';
      return Catalogo.etiquetaSiExiste('zona', fila.zone) || '';
    },

    // El catálogo puede no haber llegado todavía: un resumen sin el «y 2 más»
    // se lee bien, y una excepción acá dejaría la tarjeta entera sin dibujar.
    _frase(clave, huecos) {
      if (typeof window === 'undefined' || !window.Catalogo) return '';
      try { return Catalogo.frase(clave, huecos) || ''; } catch (err) { return ''; }
    },

    // ── El campo ─────────────────────────────────────────────────────────
    async montar(idContenedor) {
      const contenedor = document.getElementById(idContenedor);
      if (!contenedor) return;
      _avisar(contenedor, MENSAJES.cargando());

      try {
        await this.cargar();
        // El vocabulario `zona` traduce los nombres que tienen clave. Se pide
        // acá y no en cada nombre para no encadenar veinte esperas.
        if (typeof window !== 'undefined' && window.Catalogo) await Catalogo.cargar();
      } catch (err) {
        _avisar(contenedor, MENSAJES.error(err), err);
        return;
      }

      contenedor.textContent = '';

      // Estado vacío: esta Prestadora no cargó zonas. No es un error ni una
      // lista que falta: es el otro camino, y se muestra entero.
      if (!lista || lista.length === 0) { this._montarTextoLibre(contenedor); return; }

      this._montarLista(contenedor);
    },

    // El camino de texto libre, para la Prestadora que todavía no armó su lista.
    _montarTextoLibre(contenedor) {
      contenedor.setAttribute('data-zonas-modo', 'texto');

      const campo = document.createElement('textarea');
      campo.id = 'zonas-texto';
      campo.rows = 3;
      campo.required = true;
      campo.placeholder = Catalogo.frase('alta.zonas_libre_marcador');
      campo.setAttribute('data-zonas-texto', '');

      _rotulo(contenedor, campo.id,
        Catalogo.frase('alta.zonas_libre_etiqueta'),
        Catalogo.frase('alta.zonas_libre_ayuda'));
      contenedor.appendChild(campo);
    },

    // El camino de la lista: las regiones, y adentro de cada una sus municipios.
    _montarLista(contenedor) {
      contenedor.setAttribute('data-zonas-modo', 'lista');

      const grupo = document.createElement('div');
      grupo.id = 'zonas-lista';
      grupo.className = 'gd-zonas';

      _rotulo(contenedor, grupo.id,
        Catalogo.frase('alta.zonas_etiqueta'),
        Catalogo.frase('alta.zonas_ayuda'));
      contenedor.appendChild(grupo);

      const regiones = lista.filter((z) => !z.zona_padre_id);
      // Una zona cuya región no vino —porque la Prestadora la desactivó— se
      // muestra igual, al final y sin región. Esconderla sería perder una
      // opción sin decirlo.
      const sueltas = lista.filter((z) => z.zona_padre_id
        && !regiones.some((r) => r.id === z.zona_padre_id));

      regiones.forEach((region) => {
        const hijas = lista.filter((z) => z.zona_padre_id === region.id);
        grupo.appendChild(this._bloqueDeRegion(region, hijas));
      });
      if (sueltas.length > 0) grupo.appendChild(this._bloqueDeRegion(null, sueltas));
    },

    // Una región con sus municipios. Sin región —el caso de las sueltas— dibuja
    // sólo las casillas, sin la de arriba.
    _bloqueDeRegion(region, hijas) {
      const bloque = document.createElement('div');
      bloque.className = 'gd-zona-region';

      const casillasHijas = hijas.map((zona) => this._casilla(zona, 'gd-zona-hija'));

      if (region) {
        const casillaRegion = this._casilla(region, 'gd-zona-madre');
        const entrada = casillaRegion.querySelector('input');

        // Tildar la región vale por toda la región, así que sus municipios
        // quedan tildados y apagados: elegirlos aparte no diría nada distinto.
        // Destildarla los devuelve a la persona, y entonces la región se
        // muestra a medias si adentro quedó algo elegido.
        const refrescar = () => {
          casillasHijas.forEach((c) => {
            const hija = c.querySelector('input');
            hija.disabled = entrada.checked;
            if (entrada.checked) hija.checked = true;
          });
          if (!entrada.checked) {
            entrada.indeterminate = casillasHijas
              .some((c) => c.querySelector('input').checked);
          }
        };

        entrada.addEventListener('change', () => {
          if (!entrada.checked) {
            casillasHijas.forEach((c) => { c.querySelector('input').checked = false; });
          }
          entrada.indeterminate = false;
          refrescar();
        });
        casillasHijas.forEach((c) => {
          c.querySelector('input').addEventListener('change', refrescar);
        });

        bloque.appendChild(casillaRegion);
        refrescar();
      }

      if (casillasHijas.length > 0) {
        const dentro = document.createElement('div');
        dentro.className = 'gd-zona-hijas';
        casillasHijas.forEach((c) => dentro.appendChild(c));
        bloque.appendChild(dentro);
      }
      return bloque;
    },

    // Una casilla, con el identificador de la zona guardado en el atributo.
    // Ahí va el `uuid` y no el nombre: el nombre es visible y puede cambiar.
    _casilla(zona, clase) {
      const etiqueta = document.createElement('label');
      etiqueta.className = clase;

      const entrada = document.createElement('input');
      entrada.type = 'checkbox';
      entrada.id = 'zona-' + zona.id;
      entrada.setAttribute('data-zona', zona.id);

      etiqueta.setAttribute('for', entrada.id);
      etiqueta.appendChild(entrada);
      etiqueta.appendChild(document.createTextNode(' ' + this.nombreDe(zona)));
      return etiqueta;
    },

    // ── Lo que la persona eligió ─────────────────────────────────────────
    // Devuelve las dos formas de contestar en un solo objeto, porque quien
    // guarda no tiene por qué saber cuál de los dos caminos se mostró.
    //
    // Un municipio apagado no se manda: está apagado porque su región entera ya
    // está tildada, y esa región es la que vale. Mandar los dos guardaría la
    // respuesta dos veces y perdería justo la diferencia entre «toda la región»
    // y «estos municipios».
    recolectar(idContenedor) {
      const vacio = { zonas: [], texto: '' };
      const contenedor = document.getElementById(idContenedor);
      if (!contenedor) return vacio;

      const campo = contenedor.querySelector('[data-zonas-texto]');
      if (campo) return { zonas: [], texto: (campo.value || '').trim() };

      const zonas = [];
      contenedor.querySelectorAll('[data-zona]').forEach((entrada) => {
        if (entrada.checked && !entrada.disabled) zonas.push(entrada.getAttribute('data-zona'));
      });
      return { zonas, texto: '' };
    },

    // ¿Contestó algo? Lo pregunta la pantalla antes de enviar. Se responde acá
    // y no allá porque las dos formas de contestar las conoce este módulo.
    hayRespuesta(idContenedor) {
      const r = this.recolectar(idContenedor);
      return r.zonas.length > 0 || r.texto.length > 0;
    },

    // Deja el campo como recién abierto. Lo usa la aplicación del Asistente,
    // que reutiliza el mismo formulario después de enviar.
    limpiar(idContenedor) {
      const contenedor = document.getElementById(idContenedor);
      if (!contenedor) return;

      const campo = contenedor.querySelector('[data-zonas-texto]');
      if (campo) { campo.value = ''; return; }

      contenedor.querySelectorAll('[data-zona]').forEach((entrada) => {
        entrada.checked = false;
        entrada.disabled = false;
        entrada.indeterminate = false;
      });
    }
  };

  if (typeof window !== 'undefined') window.Zonas = Zonas;
})();
