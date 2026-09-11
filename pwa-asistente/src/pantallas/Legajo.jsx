/* ===================================================
   EL LEGAJO, EN CINCO PASOS

   El alta entera desde el teléfono: quién es, qué sabe hacer, con qué tiene
   experiencia, cuándo puede trabajar, y el cierre. Es la misma carga que hace
   el portal de escritorio, y por eso las piezas grandes —las zonas, la grilla
   de disponibilidad, las fichas repetibles, los documentos y los permisos del
   cierre— son las mismas de allá: acá sólo se les dice dónde ponerse.

   **Los cinco pasos viven a la vez y se muestra uno.** Es lo que permite ir y
   volver sin perder nada de lo cargado, y es también lo que permite leer el
   formulario entero al enviar, aunque en ese momento se esté viendo el último
   paso.

   **Los campos no se van copiando a la memoria del programa mientras alguien
   escribe.** Se leen de la pantalla una sola vez, al enviar. Un formulario de
   cincuenta campos que se redibuja con cada tecla es un formulario que se
   siente pesado en un teléfono, y acá nada de lo que se escribe cambia lo que
   se ve. Vaciarlo es entonces lo que hace el navegador, y las piezas que él no
   sabe vaciar —las fichas que la persona agregó, la grilla, los permisos, las
   zonas— se vuelven a montar a mano después.

   **La cuenta se crea antes que el legajo, y si no se puede crear no se sigue.**
   Antes la falla iba a la consola y la pantalla decía «¡Legajo enviado!» igual:
   la persona quedaba con el legajo guardado, sin cuenta con qué entrar, y sin
   enterarse.

   **Y guardar el legajo está escrito una sola vez**, porque hay dos caminos que
   terminan en lo mismo: el normal, y el de «ya confirmé el correo». Dos copias
   de eso se despegan con el tiempo.
=================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Catalogo, Texto } from '#comun/frases/lector.js';
import { conLaRevisionDeClaves } from '#comun/datos/claves.js';

import {
  conLasZonas, conLaDisponibilidad, conLasFichas,
  conLosDocumentos, conLasAutorizaciones
} from '../piezas/modulos.js';

import BarraDeProgreso from './Legajo/BarraDeProgreso.jsx';
import PasoUno from './Legajo/PasoUno.jsx';
import PasoDos from './Legajo/PasoDos.jsx';
import PasoTres from './Legajo/PasoTres.jsx';
import PasoCuatro from './Legajo/PasoCuatro.jsx';
import PasoCinco from './Legajo/PasoCinco.jsx';

const SIN_AVISO = { texto: '', esFalla: true };
const SIN_GUARDADO = { texto: '', color: 'var(--texto-secundario)' };

export default function Legajo({ activa, base, navegar }) {
  const { frase } = useFrases();

  const [paso, setPaso] = useState(1);
  const [disponibilidad, setDisponibilidad] = useState({ titulo: '', bajada: '', ayuda: '' });
  const [cierre, setCierre] = useState({ titulo: '', bajada: '', recordatorio: '', boton: '' });
  const [avisoDeMatricula, setAvisoDeMatricula] = useState(undefined);
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [espera, setEspera] = useState(null);
  const [avisoConfirmacion, setAvisoConfirmacion] = useState(SIN_AVISO);
  const [guardando, setGuardando] = useState(SIN_GUARDADO);
  const [exito, setExito] = useState(false);

  const formulario = useRef(null);
  const campoDeClave = useRef(null);
  const montado = useRef(false);
  const fichas = useRef(null);
  /* Lo que hace falta para terminar cuando el servidor pide confirmar el correo:
     el correo y la contraseña que la persona ya escribió, más el legajo entero
     tal como estaba. Se olvidan apenas el legajo queda guardado. No es estado de
     la pantalla —no se ve nada de esto— y por eso no vive con los demás. */
  const esperandoCorreo = useRef(null);

  /* Ir a un paso. Dibuja el paso, corre la barra de arriba y sube la pantalla:
     el formulario es largo, y sin eso el paso nuevo empieza a la altura donde
     terminaba el anterior. */
  const irA = useCallback((cual) => {
    setPaso(cual);
    const pantalla = document.getElementById('screen-registro');
    if (pantalla) pantalla.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /* Las cuatro fichas repetibles. Está aparte porque después de enviar hay que
     volver a montarlas: vaciar el formulario limpia los campos, pero no borra
     los bloques que la persona agregó. */
  const montarFichas = useCallback(() => {
    const FichasLegajo = fichas.current;
    if (!FichasLegajo) return;
    FichasLegajo.montarSeccion('ficha-matricula', 'matricula');
    FichasLegajo.montarSeccion('ficha-estudio', 'estudio', { obligatoriaAlMontar: true });
    FichasLegajo.montarSeccion('ficha-experiencia_laboral', 'experiencia_laboral', { obligatoriaAlMontar: true });
    FichasLegajo.montarSeccion('ficha-referencia', 'referencia', { obligatoriaAlMontar: true });
  }, []);

  /* Las piezas grandes se montan una sola vez, cuando la puerta a la base ya
     está abierta, y no cada vez que se entra a la pantalla: lo que la persona
     lleva cargado tiene que seguir ahí al volver. */
  useEffect(() => {
    if (!base || montado.current) return;
    montado.current = true;

    /* El paso de disponibilidad. El título dice que está cargando mientras los
       textos viajan, y si algo falla lo dice ahí mismo. */
    (async () => {
      setDisponibilidad({ titulo: frase('catalogo.cargando'), bajada: '', ayuda: '' });
      try {
        const Disponibilidad = await conLaDisponibilidad();
        const declaracion = await Disponibilidad.cargar();
        const texto = Disponibilidad.texto(declaracion.paso_de_disponibilidad);
        setDisponibilidad({
          titulo: texto.titulo || '',
          bajada: texto.bajada || '',
          ayuda: texto.ayuda_grilla || ''
        });
        await Disponibilidad.montarGrilla('grilla-disponibilidad');
        await Disponibilidad.montarPreguntas('preguntas-disponibilidad');
      } catch (err) {
        console.error('Paso de disponibilidad del Asistente:', err);
        setDisponibilidad({
          titulo: Texto.mensajeDeError(err, 'cargar el paso de disponibilidad'),
          bajada: '',
          ayuda: ''
        });
      }
    })();

    /* Las fichas y el paso de cierre. */
    (async () => {
      setCierre({ titulo: frase('catalogo.cargando'), bajada: '', recordatorio: '', boton: '' });
      try {
        const FichasLegajo = await conLasFichas();
        fichas.current = FichasLegajo;
        await FichasLegajo.cargar();
        montarFichas();

        /* Con las fichas a mano ya se puede decir si el tipo elegido exige
           Matrícula. Sin tipo elegido no exige ninguna, que es lo que contesta
           el vocabulario para el valor vacío. */
        const elegido = document.getElementById('w-profesion');
        setAvisoDeMatricula(
          FichasLegajo.requiereMatricula(elegido ? elegido.value : '') ? 'block' : 'none'
        );

        const Autorizaciones = await conLasAutorizaciones();
        const textos = await Autorizaciones.textosDelPaso();
        setCierre((antes) => ({
          titulo: textos.titulo || '',
          bajada: textos.bajada || '',
          recordatorio: textos.recordatorio || '',
          boton: textos.boton || antes.boton
        }));
        await Autorizaciones.montar('autorizaciones-container');
      } catch (err) {
        console.error('Legajo del Asistente:', err);
        window.alert(Texto.mensajeDeError(err, 'cargar los pasos del legajo'));
      }
    })();

    /* Las zonas. El módulo decide cuál de las dos formas de preguntarlas
       corresponde y maneja sus propios estados adentro del hueco. */
    (async () => {
      try {
        const Zonas = await conLasZonas();
        await Zonas.montar('zonas');
      } catch (err) {
        console.error('Zonas de cobertura del Asistente:', err);
      }
    })();

    /* Los cuatro papeles sueltos. Pedirlo acá es lo que deja anotado a qué
       depósito va cada uno y qué tipos de archivo se pueden elegir. */
    conLosDocumentos().catch((err) => {
      console.error('Documentos del legajo del Asistente:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const alElegirTipo = (evento) => {
    const FichasLegajo = fichas.current;
    if (!FichasLegajo) return;
    setAvisoDeMatricula(FichasLegajo.requiereMatricula(evento.target.value) ? 'block' : 'none');
  };

  const avisarConfirmacion = (aviso, esFalla = true) =>
    setAvisoConfirmacion({ texto: aviso || '', esFalla: esFalla });

  /* Guardar el legajo. Los cuatro estados: mientras viaja lo dice el cartel de
     abajo —los dos caminos que llegan acá apagan además su botón—, si falla lo
     dice el mismo cartel en rojo, la lista de archivos que no subieron puede
     venir sin ninguno y ése es el caso bueno, y al terminar queda el recuadro
     verde de siempre. */
  const guardarLegajo = useCallback(async (data, legajo) => {
    setGuardando({ texto: frase('asistente.guardando_legajo'), color: 'var(--texto-secundario)' });
    try {
      const FichasLegajo = fichas.current || await conLasFichas();
      const DocumentosLegajo = await conLosDocumentos();
      const Disponibilidad = await conLaDisponibilidad();
      const Autorizaciones = await conLasAutorizaciones();
      const Zonas = await conLasZonas();

      /* El identificador de la cuenta recién creada. Se pide acá porque los dos
         caminos llegan con la sesión abierta. Va a dos lugares: la fila del
         Asistente, para que pueda abrir su propio legajo, y la carpeta del
         depósito donde quedan sus archivos. */
      const usuario = await base.Sesion.getUser();
      if (usuario) data.user_id = usuario.id;

      const noSubieron = usuario
        ? await FichasLegajo.subirArchivos(legajo, usuario.id)
        : [];

      const papeles = await DocumentosLegajo.subir(usuario ? usuario.id : null);
      data.documentos = papeles.documentos;
      noSubieron.push(...papeles.fallados);

      const aspirante = await base.ClienteDatos.registrarAspirante(data);
      if (aspirante && aspirante.id) {
        await base.ClienteDatos.guardarLegajoAsistente(aspirante.id, legajo);
      }

      /* Un archivo que no sube y no avisa es peor que uno que no se cargó: la
         persona se va creyendo que entregó el papel. El resto del alta ya quedó
         guardado, así que se avisa y no se frena nada. */
      if (noSubieron.length > 0) {
        const lista = noSubieron.map((f) => '- ' + f.nombre + ': ' + f.motivo).join('\n');
        window.alert(frase('asistente.legajo_guardado_sin_archivos', { lista }));
      }

      /* La contraseña deja de estar guardada apenas no hace falta. */
      esperandoCorreo.current = null;
      setGuardando(SIN_GUARDADO);
      setEspera(null);
      setExito(true);
      if (formulario.current) formulario.current.reset();
      Disponibilidad.limpiar('grilla-disponibilidad', 'preguntas-disponibilidad');
      Autorizaciones.limpiar('autorizaciones-container');
      Zonas.limpiar('zonas');
      montarFichas();
      irA(1);
      setTimeout(() => setExito(false), 6000);
    } catch (err) {
      /* Se cuenta acá y no se vuelve a lanzar: los dos que llaman lo hacen como
         último paso, así que no hay nada más que frenar, y relanzarlo
         significaba dos avisos seguidos por la misma falla. */
      console.error('Guardado del legajo del Asistente:', err);
      setGuardando({
        texto: Texto.mensajeDeError(err, 'guardar el legajo'),
        color: 'var(--rojo-peligro-texto)'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, frase, irA, montarFichas]);

  async function enviar(evento) {
    evento.preventDefault();
    const terminos = document.getElementById('w-terminos');
    if (!terminos.checked) { window.alert(frase('asistente.falta_terminos')); return; }

    const Clave = await conLaRevisionDeClaves();
    const Zonas = await conLasZonas();
    const Disponibilidad = await conLaDisponibilidad();
    const FichasLegajo = fichas.current || await conLasFichas();
    const Autorizaciones = await conLasAutorizaciones();
    const DocumentosLegajo = await conLosDocumentos();

    const correo = document.getElementById('w-email').value.trim();
    const clave = document.getElementById('w-clave').value;
    const problemaClave = Clave.revisar(clave, document.getElementById('w-clave-repetida').value);
    if (problemaClave) {
      /* Lo que vuelve es la clave de la frase y no la frase: el texto sale del
         catálogo, en el idioma en que se esté viendo la pantalla. */
      window.alert(Catalogo.frase(problemaClave.clave, problemaClave.huecos));
      irA(1);
      if (campoDeClave.current) campoDeClave.current.focus();
      return;
    }

    /* La zona tiene dos formas de contestarse y cuál se mostró lo sabe el
       módulo, así que se le pregunta a él. Una lista de casillas sin tildar no
       la agarra el navegador, y sin esto el legajo se enviaba sin zona. */
    if (!Zonas.hayRespuesta('zonas')) {
      window.alert(Catalogo.frase('alta.zonas_falta'));
      irA(1);
      document.getElementById('zonas').scrollIntoView({ block: 'center' });
      return;
    }
    const zonasElegidas = Zonas.recolectar('zonas');

    const patologias = Array.from(document.querySelectorAll('input[name="patologia"]:checked')).map((cb) => cb.value);
    const tareas = Array.from(document.querySelectorAll('input[name="tarea_cuidado"]:checked')).map((cb) => cb.value);
    const cursos = Array.from(document.querySelectorAll('input[name="certificacion"]:checked')).map((cb) => cb.value);

    const franjas = Disponibilidad.recolectar('grilla-disponibilidad', 'preguntas-disponibilidad');

    const legajo = {
      matriculas: FichasLegajo.recolectar('ficha-matricula', 'matricula'),
      estudios: FichasLegajo.recolectar('ficha-estudio', 'estudio'),
      experiencia: FichasLegajo.recolectar('ficha-experiencia_laboral', 'experiencia_laboral'),
      referencias: FichasLegajo.recolectar('ficha-referencia', 'referencia'),
      autorizaciones: Autorizaciones.recolectar('autorizaciones-container'),
      disponibilidad: franjas,
      zonas: zonasElegidas.zonas
    };

    const data = {
      nombre: document.getElementById('w-nombre').value,
      dni: document.getElementById('w-dni').value,
      email: correo,
      telefono: document.getElementById('w-celular').value,
      cuit: document.getElementById('w-cuit').value,
      fechaNacimiento: document.getElementById('w-fecha-nac').value,
      genero: document.getElementById('w-genero').value,
      nacionalidad: document.getElementById('w-nac').value,
      domicilio: document.getElementById('w-domicilio').value,
      cbu: document.getElementById('w-cbu').value,
      profesion: document.getElementById('w-profesion').value,
      zonasTexto: zonasElegidas.texto,
      patologias,
      tareas,
      educacion: {
        nivelEstudios: document.getElementById('w-estudios').value,
        cursosCompletados: cursos
      },
      valorHora: document.getElementById('w-valor-hora').value,
      /* Los cuatro papeles, todavía sin subir. Los reemplaza el guardado con los
         caminos que devuelve el módulo, apenas hay sesión y hay carpeta donde
         dejarlos. Cuáles son los cuatro no se escribe acá. */
      documentos: DocumentosLegajo.ningunoTodavia()
    };

    setEnviando(true);
    try {
      /* La Prestadora, antes que la cuenta: el disparador de la base la resuelve
         por el dato que viaja en el alta, y sin él el perfil nace sin Prestadora
         y desde ahí toda escritura de esa cuenta queda rechazada. Falla cerrado
         a propósito: antes que dar de alta una cuenta inservible, no se da de
         alta ninguna y se dice por qué. */
      const prestadora = base.ClienteDatos.currentTenant
        || await base.ClienteDatos.initTenant().catch(() => null);
      if (!prestadora || !prestadora.slug) {
        window.alert(Catalogo.frase('alta.sin_prestadora'));
        return;
      }

      let sesion = null;
      try {
        const alta = await base.Sesion.signup(correo, clave, {
          full_name: document.getElementById('w-nombre').value,
          role: 'caregiver',
          tenant_slug: prestadora.slug
        });
        sesion = alta.session;
      } catch (errDeAlta) {
        window.alert(Texto.mensajeDeError(errDeAlta, 'crear la cuenta del Asistente'));
        return;
      }

      if (!sesion) {
        /* El servidor exige confirmar el correo antes de dar sesión, así que el
           legajo todavía no se puede guardar. La cuenta ya está creada y el
           formulario sigue lleno: el camino sigue por «ya confirmé». */
        esperandoCorreo.current = { correo, clave, data, legajo };
        setEspera({ correo });
        avisarConfirmacion('');
        return;
      }

      await guardarLegajo(data, legajo);
    } catch (err) {
      window.alert(Texto.mensajeDeError(err, 'enviar el legajo'));
    } finally {
      setEnviando(false);
    }
  }

  /* «Ya confirmé, continuar». Vuelve a entrar con la contraseña que la persona
     ya escribió y sigue guardando desde donde se había frenado. Si todavía no
     tocó el enlace, el servidor contesta que falta confirmar y el aviso lo dice
     sin borrar nada: se puede volver a intentar. */
  async function yaConfirme() {
    const pendiente = esperandoCorreo.current;
    if (!pendiente) return;
    setConfirmando(true);
    avisarConfirmacion('');
    try {
      await base.Sesion.login(pendiente.correo, pendiente.clave);
      await guardarLegajo(pendiente.data, pendiente.legajo);
    } catch (err) {
      avisarConfirmacion(Texto.mensajeDeError(err, 'entrar después de confirmar el correo'));
    } finally {
      setConfirmando(false);
    }
  }

  /* El correo que no llegó. El servidor limita cuántos manda por hora, así que
     un segundo pedido seguido puede volver con ese aviso en lugar de un mail. */
  async function reenviar() {
    const pendiente = esperandoCorreo.current;
    if (!pendiente) return;
    setReenviando(true);
    try {
      await base.Sesion.reenviarConfirmacion(pendiente.correo);
      avisarConfirmacion(Catalogo.frase('asistente.correo_reenviado'), false);
    } catch (err) {
      avisarConfirmacion(Texto.mensajeDeError(err, 'volver a mandar el correo de confirmación'));
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className={activa ? 'app-screen active' : 'app-screen'} id="screen-registro">
      <div className="wizard-header-bar">
        <button type="button" className="sin-fondo sin-borde color-sobre-color texto-18 mano" onClick={() => navegar('dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>{frase('legajo.titulo')}</h2>
      </div>

      <div className="wizard-body">
        <BarraDeProgreso paso={paso} />

        <form id="form-legajo-pwa" noValidate ref={formulario} onSubmit={enviar}>
          <PasoUno activo={paso === 1} irA={irA} campoDeClave={campoDeClave} />
          <PasoDos
            activo={paso === 2}
            irA={irA}
            alElegirTipo={alElegirTipo}
            avisoDeMatricula={avisoDeMatricula}
          />
          <PasoTres activo={paso === 3} irA={irA} />
          <PasoCuatro activo={paso === 4} irA={irA} disponibilidad={disponibilidad} />
          <PasoCinco
            activo={paso === 5}
            irA={irA}
            cierre={cierre}
            enviando={enviando}
            espera={espera}
            avisoConfirmacion={avisoConfirmacion}
            confirmando={confirmando}
            reenviando={reenviando}
            alYaConfirme={yaConfirme}
            alReenviar={reenviar}
            guardando={guardando}
            exito={exito}
          />
        </form>
      </div>
    </div>
  );
}
