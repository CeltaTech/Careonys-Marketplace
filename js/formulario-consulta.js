/* ===================================================
   EL ENVÍO DE LOS FORMULARIOS DE CONSULTA DEL PORTAL

   Cuatro pantallas públicas preguntan lo mismo —nombre, correo, celular,
   motivo y si quiere novedades— y hasta el 26 de agosto de 2026 hacían tres
   cosas distintas con la respuesta. Tres de ellas —`index.html`,
   `cursos.html` y `soporte-remoto.html`— prendían un cartel verde que decía
   «¡Solicitud enviada!» **sin haber mandado nada a ningún lado**: el guion
   que las atendía, en `js/main.js`, mostraba el cartel y limpiaba el
   formulario. La cuarta, `solicitar-asistente.html`, sí intentaba guardar.

   POR QUÉ NO ALCANZABA CON HACER QUE LAS TRES GUARDARAN COMO LA CUARTA.
   Porque la cuarta tampoco funcionaba, y eso se midió, no se supuso. Contra
   la base local, el mismo pedido que hace esa pantalla:

     · sin sesión —que es como llega cualquiera al portal— contesta
       **401, «permission denied»**: `anon` no tiene permiso sobre la tabla;
     · con una cuenta recién creada contesta **403**, porque la política
       `"Busquedas de la Prestadora"` (migración 0002) exige
       `tenant_id = prestadora_actual()`, y una cuenta nueva no tiene
       Prestadora.

   O sea que la única pantalla que decía la verdad la decía siempre en su
   forma mala: «no se pudo». Guardar una consulta pública exige abrirle la
   tabla a `anon`, y ampliar el acceso anónimo es decisión del Desarrollador
   —es el pendiente 25—, no de este archivo.

   QUÉ HACE ENTONCES. Una sola cosa, y la dice como es:

   1. Si hay sesión **y** se resolvió una Prestadora, guarda la consulta,
      que es el único caso en el que el guardado puede funcionar. Cuando ese
      camino se abra para todo el mundo, no hay que escribir nada acá.
   2. Si no, no intenta ni finge: muestra la dirección de correo del
      producto con la consulta ya redactada adentro, y deja que la persona
      la mande. Nada dice «enviado» hasta que algo se envió.

   Los cuatro estados de la regla de la empresa, para un envío: **enviando**
   mientras corre y con el botón apagado, **error** dicho en la pantalla y
   no en la consola, **listo** cuando el guardado salió, y el cuarto —que
   acá no es «vacío» sino «no hay a dónde mandarlo»— con su propio cartel.

   El texto sale del catálogo en los tres idiomas. Cuando este archivo se
   escribió, ninguna de las cuatro pantallas estaba convertida al
   multiidioma, así que lo único traducido era lo que escribe acá. **El 26 de
   agosto de 2026 se convirtieron las cuatro** —`index.html`, `cursos.html`,
   `soporte-remoto.html` y `solicitar-asistente.html`—, y la quinta,
   `formulario-integral.html`, sigue sin convertir porque está sentenciada a
   borrarse (pendiente 64). Lo de acá no cambia: los carteles del envío los
   escribe este guion y los sigue pidiendo al catálogo.
   =================================================== */

(function () {
  'use strict';

  /* El texto se pide por `Texto.frase`, que es `Catalogo.frase` con red
     abajo: si el catálogo no llegó, contesta lo genérico en vez de dejar un
     cartel en blanco. Las cinco pantallas cargan `js/catalogo.js`, pero
     `Catalogo.traducir()` se va temprano en la que no está convertida —hoy
     sólo `formulario-integral.html`—, y ahí el catálogo no se carga solo. Se
     lo pide de una, que además no cuesta nada en las que sí lo cargaron. */
  const frase = (clave) => (window.Texto ? Texto.frase(clave) : '');

  /* Los campos se buscan por su nombre —`nombre`, `email`, `celular`,
     `consulta`— y también con el prefijo de la pantalla adelante:
     `formulario-integral.html` junta tres formularios en una página, así que
     ahí los ids son `familia-nombre`, `familia-email` y así. Es la misma
     pregunta y el mismo dato; sólo cambia cómo se llama el campo. */
  function campoDe(form, id) {
    return form.querySelector('#' + id) || form.querySelector('[id$="-' + id + '"]');
  }

  function valorDe(form, id) {
    const campo = campoDe(form, id);
    return campo ? String(campo.value || '').trim() : '';
  }

  /* El motivo y el curso son claves de vocabulario, no etiquetas. Para el
     correo hace falta la etiqueta, que es lo que la persona eligió y vio. */
  function etiquetaElegida(form, id) {
    const campo = campoDe(form, id);
    if (!campo || !campo.selectedOptions || !campo.selectedOptions.length) return '';
    return String(campo.selectedOptions[0].textContent || '').trim();
  }

  /* Lo mismo con el grupo de opciones: en una pantalla se llama `newsletter`
     y en la que junta tres, `newsletter-fam`, porque tres grupos con el mismo
     nombre en una página serían uno solo. */
  function marcado(form, nombre) {
    const elegido = form.querySelector('input[name^="' + nombre + '"]:checked');
    return elegido ? elegido.value : '';
  }

  /* Los campos vacíos se marcan en rojo y el borde se limpia al escribir.
     Es el mismo comportamiento que tenía `js/main.js`, que era lo único
     rescatable de aquel guion. */
  function faltaAlgo(form) {
    let falta = false;
    form.querySelectorAll('[required]').forEach((campo) => {
      if (!String(campo.value || '').trim()) {
        falta = true;
        campo.style.borderColor = 'var(--rojo-peligro)';
        campo.addEventListener('input', () => { campo.style.borderColor = ''; }, { once: true });
      }
    });
    const correo = form.querySelector('input[type="email"]');
    if (correo && correo.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value)) {
      falta = true;
      correo.style.borderColor = 'var(--rojo-peligro)';
    }
    return falta;
  }

  /* Dónde se dice lo que pasó. Cada pantalla trae su `#form-success`
     escrito en el HTML; el cartel de este archivo se pone justo abajo para
     no pelearse con él, y se crea una sola vez. */
  function panel(form) {
    let caja = form.querySelector('.consulta-respuesta');
    if (!caja) {
      caja = document.createElement('div');
      caja.className = 'consulta-respuesta';
      caja.setAttribute('role', 'status');
      caja.style.marginTop = '14px';
      caja.style.fontSize = '14px';
      caja.style.lineHeight = '1.5';
      form.appendChild(caja);
    }
    return caja;
  }

  function decir(form, texto, color) {
    const caja = panel(form);
    caja.textContent = texto;
    caja.style.color = color || 'var(--texto-secundario)';
    caja.style.display = 'block';
    return caja;
  }

  function callar(form) {
    const caja = form.querySelector('.consulta-respuesta');
    if (caja) caja.style.display = 'none';
    const exito = form.querySelector('.form-success') || document.getElementById('form-success');
    if (exito) exito.style.display = 'none';
  }

  /* La consulta redactada, para el correo. Cada renglón es «etiqueta: lo que
     puso», y las etiquetas salen del catálogo: quien la lea la va a leer en
     el idioma en el que la persona completó el formulario. */
  function redaccion(form) {
    const renglones = [
      [frase('consulta.dato_nombre'), valorDe(form, 'nombre')],
      [frase('consulta.dato_correo'), valorDe(form, 'email')],
      [frase('consulta.dato_celular'), valorDe(form, 'celular')],
      [frase('consulta.dato_motivo'), etiquetaElegida(form, 'consulta')],
      [frase('consulta.dato_curso'), etiquetaElegida(form, 'curso')]
    ];
    const novedades = marcado(form, 'newsletter');
    if (novedades) {
      renglones.push([
        frase('consulta.dato_novedades'),
        frase(novedades === 'si' ? 'comun.si' : 'comun.no')
      ]);
    }
    return renglones
      .filter(([, valor]) => valor)
      .map(([etiqueta, valor]) => etiqueta + ': ' + valor)
      .join('\n');
  }

  /* El camino que funciona hoy para cualquiera: el correo del producto, con
     la consulta adentro. No manda nada por su cuenta —abrir el programa de
     correo de la persona no es mandar—, así que no se anuncia como enviado.

     La dirección sale de `js/identidad.js`, que es el único punto de verdad
     de la marca, y no escrita acá. */
  function ofrecerElCorreo(form) {
    const caja = decir(form, frase('consulta.no_se_recibe_aca'));
    const direccion = window.Identidad && Identidad.datos ? Identidad.datos.contacto : '';
    if (!direccion) return;

    const enlace = document.createElement('a');
    enlace.href = 'mailto:' + direccion
      + '?subject=' + encodeURIComponent(frase('consulta.asunto'))
      + '&body=' + encodeURIComponent(redaccion(form));
    enlace.textContent = frase('consulta.escribir_correo') + ' (' + direccion + ')';
    enlace.style.display = 'inline-block';
    enlace.style.marginTop = '10px';
    enlace.style.fontWeight = '700';
    caja.appendChild(document.createElement('br'));
    caja.appendChild(enlace);
  }

  /* ¿Se puede guardar? Sólo si hay sesión y además se resolvió la
     Prestadora: sin ella la fila nace sin `tenant_id` y la política la
     rechaza. Se pregunta acá y no se descubre por el fallo, para no
     mostrarle un error de permisos a quien nunca tuvo permiso.

     Falla cerrado: ante cualquier duda contesta que no, y la consulta se va
     por correo, que es el camino que sí llega. */
  async function sePuedeGuardar() {
    if (!window.ClienteDatos || !window.Sesion) return false;
    const sesion = await Sesion.getSession().catch(() => null);
    if (!sesion || !sesion.user) return false;
    const prestadora = await ClienteDatos.initTenant().catch(() => null);
    return Boolean(prestadora && prestadora.id);
  }

  async function guardar(form) {
    const sesion = await Sesion.getSession().catch(() => null);
    await ClienteDatos.crearAvisoFamilia({
      paciente: valorDe(form, 'nombre'),
      // A `consultation_reason`, que es la columna que la migración 0013
      // creó justamente para esto: «sin motivo de consulta la Prestadora no
      // distingue a quien busca cuidado de quien pregunta por un curso».
      motivoConsulta: valorDe(form, 'consulta') || form.getAttribute('data-motivo') || '',
      horarios: 'A coordinar',
      family_user_id: sesion && sesion.user ? sesion.user.id : null,
      // A `contact_info` (migración 0009): son datos de una persona y van
      // donde se los pueda encontrar, no mezclados con otra cosa.
      contacto: {
        nombre: valorDe(form, 'nombre'),
        email: valorDe(form, 'email'),
        celular: valorDe(form, 'celular')
      }
    });
  }

  async function enviar(form, boton) {
    callar(form);
    if (faltaAlgo(form)) {
      // El borde rojo solo no dice qué pasó a quien no ve bien el color ni a
      // quien lee la pantalla con un lector. La frase sí, y está en los tres
      // idiomas desde antes: la usaba el guion que tenía adentro
      // `solicitar-asistente.html`, en un `alert` que tapaba el formulario.
      decir(form, frase('aviso.faltan_campos'), 'var(--rojo-peligro)');
      return;
    }

    const etiquetaOriginal = boton ? boton.textContent : '';
    if (boton) {
      boton.disabled = true;
      boton.textContent = frase('consulta.enviando');
    }
    decir(form, frase('consulta.enviando'));

    try {
      if (await sePuedeGuardar()) {
        await guardar(form);
        decir(form, frase('consulta.enviada'), 'var(--verde-exito-texto)');
        form.reset();
      } else {
        ofrecerElCorreo(form);
      }
    } catch (err) {
      // El estado **error** se dice en la pantalla. El texto crudo de la
      // base nombra tablas y restricciones y queda en la consola, que es
      // lo que hace `Texto.mensajeDeError` con su segundo argumento.
      decir(form, Texto.mensajeDeError(err, 'dejar la consulta'), 'var(--rojo-peligro)');
    } finally {
      if (boton) {
        boton.disabled = false;
        boton.textContent = etiquetaOriginal;
      }
    }
  }

  function enganchar(form) {
    if (form.dataset.consultaEnganchada) return;
    form.dataset.consultaEnganchada = '1';
    // `data-guion-propio` le dice a `js/main.js` que no se meta. Con los dos
    // enganchados corrían los dos, y aquél prendía el cartel de «enviado»
    // antes de que éste terminara.
    form.setAttribute('data-guion-propio', '');
    const boton = form.querySelector('button[type="submit"], button:not([type])');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      enviar(form, boton);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const formularios = document.querySelectorAll('form[data-consulta]');
    if (!formularios.length) return;
    formularios.forEach(enganchar);

    /* El catálogo se pide explícitamente porque estas pantallas no están
       convertidas: `Catalogo.traducir()` se va temprano en ellas y nunca
       llega a cargarlo. Si la carga falla no se rompe nada —`Texto.frase`
       tiene su red—, pero el fallo se dice en la consola en vez de
       desaparecer. */
    if (window.Catalogo && Catalogo.cargarFrases) {
      Catalogo.cargarFrases().catch((err) => {
        console.error('El catálogo de frases de los formularios de consulta:', err);
      });
    }
  });
})();
