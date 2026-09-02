/* ===================================================
   LOS CUATRO PAPELES SUELTOS DEL LEGAJO DEL ASISTENTE
   Desarrollado por CeltaTech.

   Qué es. La foto de perfil, el documento de identidad, los antecedentes
   penales y el título no son fichas repetibles: hay uno de cada uno y no una
   lista. Por eso no viven en `js/fichas-legajo.js`, que arma matrículas,
   estudios, experiencia laboral y referencias, donde la persona agrega tantos
   bloques como tenga.

   Por qué está acá y no adentro de una pantalla. Las dos altas del Asistente
   —`registrar-asistente.html` y la aplicación del teléfono— piden los mismos
   cuatro papeles, y hasta el 2 de septiembre de 2026 una los subía y la otra
   no: los cuatro selectores del teléfono no los leía nadie, así que la persona
   elegía los archivos, guardaba, veía que se guardó, y su legajo subía sin
   ninguno. Un selector que se llena y no sube se ve exactamente igual que uno
   que sube. Copiar el bloque de una pantalla a la otra habría dejado el mismo
   patrón escrito dos veces, así que las dos llaman acá («ningún patrón repetido
   sin punto único de verdad»).

   Dónde queda anotado cada papel. Hoy, en la misma columna donde ya lo dejaba
   la pantalla de escritorio: el camino adentro del depósito, junto al resto del
   legajo. **Este módulo no decide eso y no lo cambia**: sólo hace que el lugar
   sea uno solo, para que el día que se resuelva dónde se anota un papel del
   legajo —con su tipo, su fecha de presentación y su vencimiento— haya un
   único archivo que tocar y no dos pantallas.

   Se guarda el camino, nunca una dirección: los papeles viven en un depósito
   privado y su dirección se firma recién al mostrarla. La foto va aparte, al
   depósito público, porque es la que muestra el directorio. La primera carpeta
   es siempre la cuenta: de ahí sale el permiso (migración 0006).
=================================================== */

const DocumentosLegajo = {
  /* Los cuatro, con el mismo identificador de campo en las dos pantallas. No es
     una lista de opciones que se le muestre a nadie —las etiquetas salen del
     catálogo de frases, como todo el texto visible—, sino la forma del depósito:
     qué carpeta acepta cada archivo y con qué nombre queda guardado. Cambiarla
     es cambiar lo que la migración 0006 deja escribir, así que vive al lado del
     código que la usa.

     `nombre` es la clave de la frase y no el nombre escrito: termina adentro del
     aviso de «no se pudieron subir todos los archivos», que es texto visible y
     se lee en los tres idiomas como cualquier otro. */
  LOS_CUATRO: [
    { clave: 'foto',    campo: 'foto-perfil',  deposito: 'avatares',              base: 'foto_perfil', nombre: 'alta.archivo_foto' },
    { clave: 'dni',     campo: 'file-dni',     deposito: 'documentos-cuidadores', base: 'dni_frente',  nombre: 'alta.archivo_dni' },
    { clave: 'penales', campo: 'file-penales', deposito: 'documentos-cuidadores', base: 'penales',     nombre: 'alta.archivo_penales' },
    { clave: 'titulo',  campo: 'file-titulo',  deposito: 'documentos-cuidadores', base: 'titulo',      nombre: 'alta.archivo_titulo' }
  ],

  /* El estado de partida: cuatro papeles que todavía no llegaron. Es lo que
     queda anotado cuando la persona no eligió el archivo, y también lo que
     devuelve `subir` si no hay carpeta donde dejarlos. Se arma acá y no se
     escribe en cada pantalla para que las dos guarden lo mismo. */
  ningunoTodavia() {
    const documentos = {};
    for (const doc of this.LOS_CUATRO) documentos[doc.clave] = 'pendiente';
    return documentos;
  },

  /* Sube los que la persona haya elegido y devuelve las dos mitades:
     `documentos`, para guardar junto al legajo, y `fallados`, la lista de los
     que no subieron.

     Devuelve la lista en vez de cortar por excepción, por lo mismo que
     `FichasLegajo.subirArchivos`: quien llama avisa una sola vez y sin frenar
     el resto del alta. Un archivo que no sube y no avisa es peor que uno que no
     se cargó, porque la persona se va creyendo que entregó el papel.

     `carpeta` es el identificador de la cuenta. Sin él no se sube nada: el
     permiso del depósito sale de esa primera carpeta, así que mandar el archivo
     a otro lado no es «subirlo igual», es que lo rechacen. */
  async subir(carpeta) {
    const documentos = this.ningunoTodavia();
    const fallados = [];
    if (!carpeta) return { documentos, fallados };

    for (const doc of this.LOS_CUATRO) {
      const entrada = document.getElementById(doc.campo);
      const archivo = entrada && entrada.files && entrada.files[0];
      if (!archivo) continue;
      const extension = (archivo.name.split('.').pop() || 'dat').toLowerCase();
      try {
        /* El camino lleva un identificador propio, y no sólo la cuenta y el tipo
           de papel. Armarlo con datos que no cambian fue el pendiente 89,
           cerrado el 2 de septiembre de 2026: volver a presentar el documento
           de identidad —porque venció, porque salió movida la foto— dejaba el
           archivo nuevo exactamente en el mismo lugar que el viejo y lo borraba
           sin preguntar. El que se perdía podía ser justo el que la Prestadora
           miró para sellar el legajo, y el sello quedaba apoyado en un archivo
           que ya no existía.

           Con el identificador adentro, cada subida cae en su propio lugar y no
           pisa nada. Cuál es el papel vigente lo dice la fila que guarda el
           camino, nunca el nombre del archivo. */
        documentos[doc.clave] = await Sesion.uploadFile(
          doc.deposito, `${carpeta}/${doc.base}_${Sesion.uuidNuevo()}.${extension}`, archivo
        );
      } catch (errArchivo) {
        console.error('Documentos del legajo, ' + doc.clave + ':', errArchivo);
        fallados.push({
          nombre: Texto.frase(doc.nombre),
          motivo: Texto.mensajeDeError(errArchivo)
        });
      }
    }
    return { documentos, fallados };
  },

  /* El aviso de «archivo listo para subir» al lado de cada selector, para las
     pantallas que lo tengan dibujado. Se mira si el cartel existe antes de
     tocarlo: la aplicación del teléfono todavía no lo dibuja, y una pantalla sin
     cartel no tiene por qué fallar por eso. */
  avisarLosElegidos() {
    for (const doc of this.LOS_CUATRO) {
      const entrada = document.getElementById(doc.campo);
      const cartel = document.getElementById(doc.campo + '-status');
      if (!entrada || !cartel) continue;
      entrada.addEventListener('change', () => {
        cartel.classList.toggle('oculto', entrada.files.length === 0);
      });
    }
  }
};

if (typeof window !== 'undefined') window.DocumentosLegajo = DocumentosLegajo;
