/* ===================================================
   ALTA DE ASISTENTE

   La pantalla más larga del sitio: siete pasos, nueve vocabularios, cuatro
   fichas repetibles, siete archivos y cinco escrituras al cerrar. Va adentro del
   marco —barra de arriba y pie—, porque los tenía, y conserva el ancla
   `#registro` sobre el formulario, que es el destino de los ocho «Registrarme»
   repartidos por el sitio.

   **Lo que decide esta pantalla está acá; lo que dibuja está al lado.** Los
   siete pasos, la barra de progreso, las listas del catálogo y la caja de los
   cuatro estados viven en `RegistrarAsistente/`, y acá queda lo único que no se
   puede partir: el orden en que se arma el formulario, la revisión paso por
   paso, y el guardado.

   **Los campos se leen del documento, no de una copia.** Es lo que hacía la
   página, y no es un atajo: el alta termina con un `form.reset()` del navegador,
   y un campo cuyo valor guardara el programa se quedaría escrito después de
   vaciar el formulario. Las dos contraseñas son la excepción obligada —pasan por
   el campo de contraseña propio, que pide su valor— y por eso se vacían a mano.

   **La dirección de la base y su clave no se escriben en ningún lado**: salen de
   `js/apiClient.js`, que se abre por la puerta. Y los cinco módulos que dibujan
   los pasos 1, 4, 5, 6 y 7 son los mismos que usa la aplicación del teléfono: se
   traen y se les dice dónde montar, nunca se copian.
=================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import { Catalogo, Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';
import { conLaRevisionDeClaves } from '#comun/datos/claves.js';
import Presentacion from './RegistrarAsistente/Presentacion.jsx';
import BarraDePasos from './RegistrarAsistente/BarraDePasos.jsx';
import CajaDeEstado from './RegistrarAsistente/CajaDeEstado.jsx';
import PasosDeDatos from './RegistrarAsistente/PasosDeDatos.jsx';
import PasosDeLegajo from './RegistrarAsistente/PasosDeLegajo.jsx';
import PasoDeCierre from './RegistrarAsistente/PasoDeCierre.jsx';

/* Las cuatro fichas repetibles del paso 5, tal como se montan. La matrícula es
   la única que no nace con un bloque abierto: se carga sólo si el Tipo de
   Asistente elegido la exige. */
function montarFichas() {
  const FichasLegajo = window.FichasLegajo;
  if (!FichasLegajo || !FichasLegajo.fichas) return;
  FichasLegajo.montarSeccion('ficha-matricula', 'matricula');
  FichasLegajo.montarSeccion('ficha-estudio', 'estudio', { obligatoriaAlMontar: true });
  FichasLegajo.montarSeccion('ficha-experiencia_laboral', 'experiencia_laboral', { obligatoriaAlMontar: true });
  FichasLegajo.montarSeccion('ficha-referencia', 'referencia', { obligatoriaAlMontar: true });
}

const valorDe = (id) => {
  const campo = document.getElementById(id);
  return campo ? campo.value : '';
};

export default function RegistrarAsistente() {
  const { frase } = useFrases();
  usePestana('alta.titulo', { descripcion: 'alta.descripcion', fueraDeBuscadores: true });

  const [paso, setPaso] = useState(1);
  const [intento, setIntento] = useState(0);

  const [legajoEstado, setLegajoEstado] = useState({ cual: 'cargando', clave: 'catalogo.cargando' });
  const [hayReintentar, setHayReintentar] = useState(false);
  const [altaEstado, setAltaEstado] = useState({ cual: null });

  const [tiposDeAsistente, setTiposDeAsistente] = useState([]);
  /* En blanco mientras no se sepa qué Tipo de Asistente se eligió: el aviso de
     la matrícula todavía no se puso ni de un lado ni del otro. */
  const [exigeMatricula, setExigeMatricula] = useState(null);
  const [avisoMatriculaCritico, setAvisoMatriculaCritico] = useState(false);
  const [textosDisponibilidad, setTextosDisponibilidad] = useState({ titulo: '', bajada: '', ayuda: '' });
  const [textosCierre, setTextosCierre] = useState({ titulo: '', bajada: '', recordatorio: '', boton: '' });

  const [enviando, setEnviando] = useState(false);
  const [esperandoCorreo, setEsperandoCorreo] = useState(false);
  const [correoDelAlta, setCorreoDelAlta] = useState('');
  const [avisoConfirmar, setAvisoConfirmar] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [exito, setExito] = useState(false);

  const [clave, setClave] = useState('');
  const [claveRepetida, setClaveRepetida] = useState('');

  const wizard = useRef(null);
  const formulario = useRef(null);
  const campoClave = useRef(null);
  const campoClaveRepetida = useRef(null);
  const fichasListas = useRef(false);
  const yaSeAvisoDeLosArchivos = useRef(false);
  const relojDelExito = useRef(null);

  /* Lo que el alta necesita recordar mientras se espera el clic del correo. La
     contraseña queda en memoria y en ningún otro lado: ni en el almacenamiento
     del navegador ni colgada de la dirección. Vive lo que vive la pestaña. */
  const altaEsperandoCorreo = useRef(null);

  /* El aviso del panel de confirmación. Verde cuando la noticia es buena, rojo
     cuando algo salió mal; con el texto vacío desaparece. */
  const avisarConfirmacion = (mensaje, esError = true) =>
    setAvisoConfirmar(mensaje ? { mensaje, esError } : null);

  const irAlPaso = useCallback((numero) => {
    setPaso(numero);
    // Al principio del formulario, que es donde empieza el paso al que se va.
    if (wizard.current) wizard.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  /* Al abrir, la pantalla se acomoda sobre el formulario, igual que la página:
     lo de arriba es la presentación y ya se leyó, o se lee volviendo. */
  useEffect(() => {
    if (wizard.current) wizard.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => () => clearTimeout(relojDelExito.current), []);

  /* ARMADO DEL FORMULARIO: FICHAS, ZONAS, DISPONIBILIDAD Y CIERRE.
     Se dibujan desde data/catalogo-fichas.json, data/catalogo-disponibilidad.json
     y data/catalogo-autorizaciones.json, nunca a mano.

     Es el último que espera, así que es el que tiene que atrapar: los que se
     llaman acá adentro traen datos y no muestran nada, y sin este `try` el fallo
     moriría dejando el formulario a medias y sin cartel. El `try` abraza el
     cuerpo entero a propósito: los catálogos arman **un** formulario, y con uno
     solo que falte no hay medio legajo que ofrecer. */
  useEffect(() => {
    let vigente = true;
    setHayReintentar(false);
    setLegajoEstado({ cual: 'cargando', clave: 'catalogo.cargando' });

    (async () => {
      try {
        // Las frases primero: son las que este mismo bloque necesita para poder
        // decir en el idioma de la pantalla lo que le pase a los demás.
        await Catalogo.cargarFrases();
        if (!vigente) return;
        setLegajoEstado({ cual: 'cargando', clave: 'alta.legajo_cargando' });

        /* La puerta a la base y los cinco módulos que dibujan los pasos. La
           puerta hace falta antes que nada de esto: las zonas de cobertura salen
           de la base y el módulo las pide por el cliente de datos, y los cuatro
           selectores de archivo sólo pueden declarar qué aceptan cuando la
           sesión ya está disponible. */
        await Promise.all([
          conLaBase(),
          import('#js/fichas-legajo.js'),
          import('#js/documentos-legajo.js'),
          import('#js/disponibilidad.js'),
          import('#js/autorizaciones.js'),
          import('#js/zonas.js')
        ]);
        if (!vigente) return;

        const { FichasLegajo, DocumentosLegajo, Disponibilidad, Autorizaciones, Zonas } = window;

        // A qué depósito va cada papel lo declara el módulo, y con eso queda
        // escrito lo que cada selector deja elegir.
        DocumentosLegajo.declararSusDepositos();
        // El cartel de «archivo listo para subir» al lado de cada selector, una
        // sola vez: el módulo agrega su escucha y no la saca.
        if (!yaSeAvisoDeLosArchivos.current) {
          yaSeAvisoDeLosArchivos.current = true;
          DocumentosLegajo.avisarLosElegidos();
        }

        await FichasLegajo.cargar();
        if (!vigente) return;
        montarFichas();
        fichasListas.current = true;

        const tipos = FichasLegajo.opcionesVocabulario('tipo_asistente');

        /* Estado vacío: el catálogo contestó y no trajo ni un Tipo de Asistente.
           Sin esa lista el paso 2 no se puede completar, así que se dice y no se
           sigue armando un formulario que nadie va a poder terminar. Sin esta
           rama, cero opciones y una falla se ven igual. */
        if (!tipos.length) {
          setHayReintentar(true);
          setLegajoEstado({ cual: 'vacio', clave: 'alta.legajo_vacio' });
          return;
        }

        setTiposDeAsistente(tipos.map((item) => ({
          clave: item.clave,
          texto: item[FichasLegajo.idioma] || item['es-AR']
        })));
        setExigeMatricula(FichasLegajo.requiereMatricula(valorDe('profesion')));

        // Las zonas de cobertura. La lista es de cada Prestadora y sale de la
        // base, así que el módulo la trae y arma el campo; si esa Prestadora no
        // cargó ninguna, el mismo hueco pasa a ser el de texto libre.
        await Zonas.montar('zonas');
        if (!vigente) return;

        // La disponibilidad. La grilla y la pregunta de los reemplazos urgentes
        // las arma el módulo; acá sólo se le dice dónde.
        const declaracion = await Disponibilidad.cargar();
        if (!vigente) return;
        const pasoDisponibilidad = Disponibilidad.texto(declaracion.paso_de_disponibilidad);
        setTextosDisponibilidad({
          titulo: pasoDisponibilidad.titulo || '',
          bajada: pasoDisponibilidad.bajada || '',
          ayuda: pasoDisponibilidad.ayuda_grilla || ''
        });
        await Disponibilidad.montarGrilla('grilla-disponibilidad');
        await Disponibilidad.montarPreguntas('preguntas-disponibilidad');
        if (!vigente) return;

        // El cierre: lo que la persona autoriza a publicar.
        const cierre = await Autorizaciones.textosDelPaso();
        if (!vigente) return;
        setTextosCierre({
          titulo: cierre.titulo || '',
          bajada: cierre.bajada || '',
          recordatorio: cierre.recordatorio || '',
          boton: cierre.boton || ''
        });
        await Autorizaciones.montar('autorizaciones-container');
        if (!vigente) return;

        // Estado listo: el cartel se va y lo que queda es el formulario.
        setLegajoEstado({ cual: null });
      } catch (err) {
        /* Estado error, con el botón para volver a intentarlo: lo cargado en los
           pasos que sí se armaron sigue en pantalla y no se pierde nada. */
        if (!vigente) return;
        setHayReintentar(true);
        setLegajoEstado({ cual: 'error', clave: Texto.claveDeError(err, 'armar el formulario del legajo') });
      }
    })();

    return () => { vigente = false; };
  }, [intento]);

  /* LA REVISIÓN DE UN PASO. Mira el documento y no una copia, porque buena parte
     de los campos obligatorios de esta pantalla los dibujan los módulos: la
     grilla de disponibilidad, las cuatro fichas y las autorizaciones. Un campo
     que aparece solo no está en ninguna lista escrita acá, y `[required]` sí lo
     encuentra. */
  function validarPaso(paneId) {
    const pane = document.getElementById(paneId);
    if (!pane) return true;
    let valido = true;
    let primerCampoMal = null;

    pane.querySelectorAll('[required]').forEach((campo) => {
      // Los selectores de archivo se miran por lo que tienen elegido.
      if (campo.type === 'file') {
        if (!campo.files || campo.files.length === 0) {
          valido = false;
          campo.style.outline = '2px solid var(--rojo-peligro)';
          campo.style.borderRadius = '4px';
          if (!primerCampoMal) primerCampoMal = campo;
          campo.addEventListener('change', () => { campo.style.outline = ''; }, { once: true });
        }
      } else if (campo.type !== 'checkbox' && !campo.value.trim()) {
        valido = false;
        campo.style.borderColor = 'var(--rojo-peligro)';
        if (!primerCampoMal) primerCampoMal = campo;
        campo.addEventListener('input', () => { campo.style.borderColor = ''; }, { once: true });
      }
    });

    /* Paso 1: las zonas de cobertura. No se validan con `required` como los
       demás campos porque hay dos formas de contestar —tildar una o más zonas, o
       escribir a mano cuando la Prestadora no cargó lista—, y cuál de las dos se
       mostró lo sabe el módulo. Preguntarle a él es lo que evita tener la misma
       decisión escrita en dos lados. */
    const hueco = pane.querySelector('#zonas');
    const Zonas = window.Zonas;
    if (hueco && Zonas && !Zonas.hayRespuesta('zonas')) {
      valido = false;
      hueco.style.outline = '2px solid var(--rojo-peligro)';
      hueco.style.borderRadius = '4px';
      /* El aviso general dice «faltan campos» y no alcanza: acá el campo puede
         ser una lista de casillas, que no se ve vacía como se ve un renglón
         vacío. El texto sale del catálogo, en los tres idiomas. */
      let avisoZonas = hueco.querySelector('.gd-zonas-falta');
      if (!avisoZonas) {
        avisoZonas = document.createElement('p');
        avisoZonas.className = 'gd-pregunta-ayuda gd-zonas-falta';
        avisoZonas.style.color = 'var(--rojo-peligro)';
        hueco.appendChild(avisoZonas);
      }
      avisoZonas.textContent = Texto.frase('alta.zonas_falta');
      const despejarZonas = () => {
        hueco.style.outline = '';
        if (avisoZonas.parentNode) avisoZonas.remove();
      };
      hueco.addEventListener('change', despejarZonas, { once: true });
      hueco.addEventListener('input', despejarZonas, { once: true });
      if (!primerCampoMal) primerCampoMal = hueco.querySelector('input, textarea');
    }

    /* Paso 5 (Legajo): las fichas ya validan sus propios bloques, y la Matrícula
       es obligatoria sólo cuando el Tipo de Asistente elegido la exige. */
    if (paneId === 'step-pane-5' && fichasListas.current) {
      const FichasLegajo = window.FichasLegajo;
      ['matricula', 'estudio', 'experiencia_laboral', 'referencia'].forEach((tipo) => {
        if (!FichasLegajo.validarSeccion(`ficha-${tipo}`, tipo)) valido = false;
      });
      const exige = FichasLegajo.requiereMatricula(valorDe('profesion'));
      const tiene = FichasLegajo.recolectar('ficha-matricula', 'matricula').length > 0;
      if (exige && !tiene) {
        valido = false;
        setAvisoMatriculaCritico(true);
      }
    }

    if (!valido) {
      alert(Texto.frase('alta.faltan_obligatorios'));
      if (primerCampoMal) primerCampoMal.focus();
    }
    return valido;
  }

  // El botón de seguir revisa el paso en el que está antes de dejar pasar.
  const seguir = (siguiente) => {
    if (validarPaso(`step-pane-${paso}`)) irAlPaso(siguiente);
  };

  /* EL TRAMO QUE ESCRIBE: los archivos, la ficha y el legajo. Está aparte porque
     se entra por dos puertas —el envío normal, cuando el alta ya trae la sesión
     abierta, y «Ya confirmé, continuar», cuando el servidor pidió confirmar el
     correo antes—.

     Devuelve si el legajo quedó guardado. **No vuelve a lanzar el fallo**: ya lo
     dijo en la pantalla, y relanzarlo haría que quien llama lo dijera otra vez.
     Quien llama mira lo que devuelve para saber si puede dar el paso siguiente,
     que en «Ya confirmé» es olvidar la contraseña y cerrar el panel: hacer eso
     después de un guardado que falló dejaría el legajo perdido y sin aviso. */
  async function guardarLegajo(userId, email) {
    const form = formulario.current;
    const { ClienteDatos, DocumentosLegajo, FichasLegajo, Disponibilidad, Autorizaciones, Zonas } = window;

    // Estado cargando, antes de la primera espera. Cerrar el alta son cinco
    // escrituras seguidas y ninguna es instantánea.
    setAltaEstado({ cual: 'cargando', clave: 'alta.guardando' });

    try {
      /* Con la sesión abierta la Prestadora se vuelve a resolver, y ahora sale
         del perfil: es el mismo dato que va a mirar la política al escribir. */
      ClienteDatos._resolucionEnCurso = null;
      await ClienteDatos.initTenant();

      /* Los cuatro papeles sueltos, a su depósito. Un archivo que no sube y no
         avisa es peor que uno que no se cargó: la persona se va creyendo que
         entregó el papel. Se juntan los que fallaron y se avisa una sola vez,
         sin frenar el resto del alta.

         El módulo devuelve **la lista de los que no subieron**, no una
         excepción, y eso ya se maneja como dato. Lo otro —que el módulo se caiga
         entero, que sin red es lo que pasa— sí sale por excepción, y dejarla
         llegar al `catch` de abajo cortaría el alta de alguien cuya cuenta ya
         quedó creada. Se cuenta como cuatro archivos que no subieron. */
      let docUrls = DocumentosLegajo.ningunoTodavia();
      const adjuntosFallados = [];
      try {
        const papeles = await DocumentosLegajo.subir(userId);
        docUrls = papeles.documentos;
        adjuntosFallados.push(...papeles.fallados);
      } catch (errPapeles) {
        console.error('Alta de Asistente, documentos del legajo:', errPapeles);
        adjuntosFallados.push({
          nombre: Texto.frase('alta.archivo_legajo'),
          motivo: Texto.mensajeDeError(errPapeles)
        });
      }

      const patologias = Array.from(form.querySelectorAll('input[name="patologia"]:checked')).map((cb) => cb.value);
      const tareas = Array.from(form.querySelectorAll('input[name="tarea_cuidado"]:checked')).map((cb) => cb.value);
      const cursos = Array.from(form.querySelectorAll('input[name="certificacion"]:checked')).map((cb) => cb.value);
      // Días y turnos salen con la clave del catálogo —`lunes`, `manana`—, que
      // es lo que esperan las columnas de franjas_asistente.
      const disponibilidad = Disponibilidad.recolectar('grilla-disponibilidad', 'preguntas-disponibilidad');

      /* Las zonas llegan en un solo objeto porque hay dos formas de contestar y
         quien guarda no tiene por qué saber cuál se mostró: las tildadas van a
         zonas_asistente con el legajo, y lo escrito a mano va a caregivers con
         el resto del alta. */
      const zonasElegidas = Zonas.recolectar('zonas');

      const data = {
        user_id: userId,
        nombre: valorDe('nombre'),
        dni: valorDe('dni-num'),
        email,
        telefono: valorDe('celular'),
        cuit: valorDe('cuit-cuil'),
        fechaNacimiento: valorDe('fecha-nacimiento'),
        genero: valorDe('genero'),
        nacionalidad: valorDe('nacionalidad'),
        domicilio: valorDe('domicilio'),
        cbu: valorDe('cbu-alias'),
        profesion: valorDe('profesion'),
        zonasTexto: zonasElegidas.texto,
        patologias,
        tareas,
        educacion: {
          nivelEstudios: valorDe('nivel-estudios'),
          cursosCompletados: cursos
        },
        valorHora: valorDe('valor-hora'),
        documentos: docUrls    // caminos dentro de los depósitos, no direcciones
      };

      const aspirante = await ClienteDatos.registrarAspirante(data);

      /* Estado vacío: el alta contestó y no trajo el Asistente, así que no hay a
         quién colgarle el legajo. Sin esta rama el legajo entero se perdería en
         silencio y la pantalla pondría igual el cartel de éxito. */
      if (!aspirante || !aspirante.id) {
        setAltaEstado({ cual: 'vacio', clave: 'alta.sin_asistente' });
        return false;
      }

      const legajo = {
        matriculas: FichasLegajo.recolectar('ficha-matricula', 'matricula'),
        estudios: FichasLegajo.recolectar('ficha-estudio', 'estudio'),
        experiencia: FichasLegajo.recolectar('ficha-experiencia_laboral', 'experiencia_laboral'),
        referencias: FichasLegajo.recolectar('ficha-referencia', 'referencia'),
        autorizaciones: Autorizaciones.recolectar('autorizaciones-container'),
        disponibilidad,
        zonas: zonasElegidas.zonas
      };

      /* Los archivos de matrícula y estudio van al depósito privado; en la tabla
         queda el camino, igual que los otros adjuntos. Si el módulo se cae
         entero el fallo sale por excepción, y dejarlo llegar al `catch` de abajo
         perdería el legajo de alguien que ya quedó registrado. */
      try {
        adjuntosFallados.push(...await FichasLegajo.subirArchivos(legajo, userId));
      } catch (errFichas) {
        console.error('Alta de Asistente, archivos del legajo:', errFichas);
        adjuntosFallados.push({
          nombre: Texto.frase('alta.archivo_legajo'),
          motivo: Texto.mensajeDeError(errFichas)
        });
      }

      await ClienteDatos.guardarLegajoAsistente(aspirante.id, legajo);

      if (adjuntosFallados.length) {
        const lista = adjuntosFallados.map((f) => '- ' + f.nombre + ': ' + f.motivo).join('\n');
        alert(Texto.frase('alta.archivos_no_subidos', { lista }));
      }

      // Estado listo: el cartel se va y lo que queda es el cartel de éxito.
      setAltaEstado({ cual: null });
      setExito(true);
      form.reset();
      /* `form.reset()` es del navegador y vacía lo que el navegador tiene. Las
         dos contraseñas las tiene la pantalla, así que se vacían acá: sin esto
         volverían a escribirse solas en el dibujo siguiente. */
      setClave('');
      setClaveRepetida('');
      Disponibilidad.limpiar('grilla-disponibilidad', 'preguntas-disponibilidad');
      montarFichas();
      irAlPaso(1);
      clearTimeout(relojDelExito.current);
      relojDelExito.current = setTimeout(() => setExito(false), 6000);
      return true;
    } catch (err) {
      /* Estado error. Acá mueren los tres que traen datos y no muestran nada
         —`initTenant`, `registrarAspirante` y `guardarLegajoAsistente`—, así que
         es este renglón el que tiene que decirlo: lo cargado sigue en pantalla y
         se puede volver a enviar. */
      setAltaEstado({ cual: 'error', clave: Texto.claveDeError(err, 'guardar el legajo del alta') });
      return false;
    }
  }

  async function enviar(evento) {
    evento.preventDefault();

    // Revisar paso por paso (del 1 al 7) para asegurar que nada quedó vacío.
    for (let i = 1; i <= 7; i++) {
      if (!validarPaso(`step-pane-${i}`)) {
        irAlPaso(i);
        return;
      }
    }

    /* La contraseña: dos veces igual y de largo suficiente. Quien decide qué
       vale es el archivo de siempre, para que las tres pantallas que piden
       contraseña pidan lo mismo. El servidor la rechazaría igual, pero avisar
       acá evita crear media cuenta. */
    const Clave = await conLaRevisionDeClaves();
    const problemaClave = Clave.revisar(clave, claveRepetida);
    if (problemaClave) {
      // `revisar` devuelve la clave de la frase, no la frase.
      alert(frase(problemaClave.clave, problemaClave.huecos));
      irAlPaso(1);
      const campo = clave === claveRepetida ? campoClave : campoClaveRepetida;
      if (campo.current) campo.current.focus();
      return;
    }

    const acepta = document.getElementById('acepto-terminos');
    if (!acepta || !acepta.checked) {
      alert(Texto.frase('alta.faltan_terminos'));
      if (acepta) acepta.focus();
      return;
    }

    setEnviando(true);

    try {
      const { ClienteDatos, Sesion } = await conLaBase();

      /* 1. La cuenta primero, y con sesión abierta antes de escribir nada. Sin
            sesión las escrituras salen como visitante anónimo y la base las
            rechaza: el legajo se perdería entero y en silencio. */
      const email = valorDe('email');

      /* La Prestadora, antes que la cuenta. El disparador de la base la resuelve
         por el nombre corto que viaja en el alta; si no le llega ninguno, el
         perfil nace sin Prestadora y desde ahí la RLS rechaza toda escritura de
         esa cuenta. Falla cerrado a propósito: antes que dar de alta una cuenta
         huérfana, no se da de alta ninguna y se dice por qué. */
      const prestadora = ClienteDatos.currentTenant
        || await ClienteDatos.initTenant().catch(() => null);
      if (!prestadora || !prestadora.slug) {
        alert(frase('alta.sin_prestadora'));
        return;
      }

      let sesion = null;
      let userId = null;

      try {
        const alta = await Sesion.signup(email, clave, {
          full_name: valorDe('nombre'),
          role: 'caregiver',
          tenant_slug: prestadora.slug
        });
        sesion = alta.session;
        userId = alta.user ? alta.user.id : null;
      } catch (authErr) {
        console.error('Alta de Asistente, cuenta:', authErr);
        alert(Texto.mensajeDeError(authErr));
        return;
      }

      if (!sesion) {
        /* Pasa cuando el servidor exige confirmar el correo: la cuenta queda
           creada y la sesión no llega hasta que se abra el enlace del mail. Nada
           de lo cargado se toca —sigue en pantalla, paso por paso— y el camino
           sigue por el botón «Ya confirmé, continuar», que entra con esta misma
           contraseña y guarda el legajo sin pedir nada de nuevo. */
        altaEsperandoCorreo.current = { email, clave };
        setCorreoDelAlta(email);
        avisarConfirmacion('');
        setEsperandoCorreo(true);
        const panel = document.getElementById('cierre-confirmar');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      /* Lo que devuelve no se mira acá: si el guardado falló ya lo dijo en su
         propio cartel, y lo único que falta es reponer el botón, que lo hace el
         `finally` de abajo pase lo que pase. */
      await guardarLegajo(userId, email);
    } catch (err) {
      console.error('Alta de Asistente:', err);
      alert(Texto.frase('alta.no_se_completo'));
    } finally {
      setEnviando(false);
    }
  }

  /* «Ya confirmé, continuar». Reintenta el ingreso con la contraseña que la
     persona ya escribió y sigue guardando desde donde se había frenado. Si
     todavía no tocó el enlace, el servidor contesta que el correo no está
     confirmado y el aviso lo dice sin borrar nada: se puede volver a intentar. */
  async function yaConfirme() {
    if (!altaEsperandoCorreo.current) return;
    setConfirmando(true);
    avisarConfirmacion('');
    try {
      const { Sesion } = await conLaBase();
      const usuario = await Sesion.login(
        altaEsperandoCorreo.current.email,
        altaEsperandoCorreo.current.clave
      );
      /* Si el guardado falló ya lo dijo en su cartel, y acá hay que frenar:
         olvidar la contraseña y cerrar el panel dejaría el legajo perdido sin
         ninguna forma de volver a mandarlo. */
      if (!await guardarLegajo(usuario.id, altaEsperandoCorreo.current.email)) return;
      /* Guardado. Se olvida la contraseña y la pantalla vuelve a quedar como
         estaba, por si en la misma máquina se da de alta a otra persona. */
      altaEsperandoCorreo.current = null;
      setEsperandoCorreo(false);
    } catch (err) {
      avisarConfirmacion(Texto.mensajeDeError(err, 'entrar después de confirmar el correo'));
    } finally {
      setConfirmando(false);
    }
  }

  /* El correo que no llegó. El servidor limita cuántos manda por hora, así que
     un segundo pedido seguido puede volver con ese aviso en lugar de un mail. */
  async function reenviar() {
    if (!altaEsperandoCorreo.current) return;
    setReenviando(true);
    try {
      const { Sesion } = await conLaBase();
      await Sesion.reenviarConfirmacion(altaEsperandoCorreo.current.email);
      avisarConfirmacion(Texto.frase('alta.correo_reenviado'), false);
    } catch (err) {
      avisarConfirmacion(Texto.mensajeDeError(err, 'volver a mandar el correo de confirmación'));
    } finally {
      setReenviando(false);
    }
  }

  return (
    <>
      <Presentacion />

      {/* `id="registro"` es el destino de los ocho «Registrarme» del sitio: se
          muda con el formulario, nunca con el envoltorio. */}
      <section className="container" id="registro" style={{ marginTop: '-20px', marginBottom: '60px' }}>
        <div
          ref={wizard}
          className="wizard-container"
          style={{
            background: 'var(--superficie)', padding: '40px', borderRadius: '16px',
            boxShadow: 'var(--sombra-suave)', maxWidth: '960px', margin: '0 auto'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span className="eyebrow" style={{
              color: 'var(--tono-info-texto)', fontWeight: 700, fontSize: '12px',
              textTransform: 'uppercase', letterSpacing: '1px'
            }}>
              {frase('alta.eyebrow')}
            </span>
            <h2 className="texto-28 peso-800 color-titulo mt-4">{frase('legajo.titulo')}</h2>
            <p style={{
              fontSize: '14px', color: 'var(--texto-secundario)',
              maxWidth: '600px', margin: '8px auto 0 auto'
            }}>
              {frase('alta.bajada_formulario')}
            </p>
          </div>

          <BarraDePasos paso={paso} />

          {/* LOS CUATRO ESTADOS DEL ARMADO DEL LEGAJO. Los pasos 4, 5 y 7 no
              están escritos acá: los dibujan los módulos con lo que traen sus
              catálogos. Mientras eso viaja —y si no llega— la pantalla tiene que
              decirlo, porque un formulario a medias sin cartel se ve igual que
              uno terminado. */}
          <CajaDeEstado
            id="legajo-estado"
            cual={legajoEstado.cual}
            clave={legajoEstado.clave}
            huecos={legajoEstado.huecos}
            estilo={{ marginBottom: '20px' }}
          >
            <button
              type="button"
              className={hayReintentar ? 'btn btn-secundario' : 'btn btn-secundario oculto'}
              id="legajo-reintentar"
              style={{ padding: '6px 16px', fontSize: '12.5px' }}
              onClick={() => setIntento((cuantos) => cuantos + 1)}
            >
              {frase('acceso.reintentar')}
            </button>
          </CajaDeEstado>

          <form id="form-registro-cuidador-completo" ref={formulario} onSubmit={enviar} noValidate>
            <PasosDeDatos
              paso={paso}
              irAlPaso={irAlPaso}
              seguir={seguir}
              tiposDeAsistente={tiposDeAsistente}
              alCambiarProfesion={(evento) => {
                const FichasLegajo = window.FichasLegajo;
                if (FichasLegajo) setExigeMatricula(FichasLegajo.requiereMatricula(evento.target.value));
              }}
              clave={clave}
              alEscribirClave={(evento) => setClave(evento.target.value)}
              campoClave={campoClave}
              claveRepetida={claveRepetida}
              alEscribirClaveRepetida={(evento) => setClaveRepetida(evento.target.value)}
              campoClaveRepetida={campoClaveRepetida}
            />

            <PasosDeLegajo
              paso={paso}
              irAlPaso={irAlPaso}
              seguir={seguir}
              textosDisponibilidad={textosDisponibilidad}
              exigeMatricula={exigeMatricula}
              avisoMatriculaCritico={avisoMatriculaCritico}
            />

            <PasoDeCierre
              paso={paso}
              irAlPaso={irAlPaso}
              textosCierre={textosCierre}
              altaEstado={altaEstado}
              enviando={enviando}
              esperandoCorreo={esperandoCorreo}
              correoDelAlta={correoDelAlta}
              avisoConfirmar={avisoConfirmar}
              confirmando={confirmando}
              reenviando={reenviando}
              exito={exito}
              yaConfirme={yaConfirme}
              reenviar={reenviar}
            />
          </form>
        </div>
      </section>
    </>
  );
}
