/* ===================================================
   EL CAMPO DE CONTRASEÑA, CON SU BOTÓN DE MOSTRAR

   Escribir una contraseña a ciegas y equivocarse es la causa más común de no
   poder entrar, así que todo campo de contraseña lleva su botón. Antes lo ponía
   solo el archivo que decide qué contraseña vale: al cargar la página buscaba
   los campos y los envolvía. Acá eso no puede seguir así, y no es un capricho
   de la herramienta: ese archivo corre una vez, cuando todavía no existe
   ninguna pantalla, y lo que hace es mover el campo adentro de una caja nueva
   —que es justo el pedazo que ahora dibuja el programa—. Las dos cosas juntas
   dan un campo sin botón, sin largo mínimo y sin el aviso de cuántos
   caracteres hacen falta, que es exactamente lo que se había perdido.

   Así que el envoltorio se dibuja acá, una vez, y las tres pantallas que piden
   contraseña usan este campo. **El número sigue viniendo de un solo lugar**: se
   le pregunta al mismo archivo de siempre, no se escribe acá.

   **El rótulo dice «Mostrar» y «Ocultar» con todas las letras** y no un dibujo
   de ojo: un ojo tachado no aclara si lo que se ve ahora es el estado o lo que
   va a pasar si se aprieta. Eso estaba decidido y no cambia.

   **El aviso de cuántos caracteres sólo aparece donde se elige una contraseña
   nueva.** En el ingreso no: una cuenta vieja puede tener una más corta que la
   que hoy se pide, y el navegador no la dejaría ni probar.

   **Y toda contraseña de esta web se pide con este campo, sin excepción.** El
   archivo que decide el largo sigue saliendo a envolver campos apenas se carga,
   como hacía en las páginas sueltas, y saltea los que ya tienen su caja —los de
   acá—. Un campo de contraseña escrito a mano en otra pantalla sí lo agarraría,
   y moverlo de lugar por debajo es exactamente lo que rompe a un programa que
   dibuja sus propias pantallas.
=================================================== */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useFrases } from '../frases/ProveedorDeFrases.jsx';
import { conLaRevisionDeClaves } from '../datos/claves.js';

/* Se pasa hacia afuera el campo de adentro, no la caja: las pantallas lo usan
   para llevar el cursor al campo que quedó mal, y lo que hay que enfocar es el
   campo. */
const CampoDeClave = forwardRef(function CampoDeClave({
  id, value, onChange, autoComplete = 'current-password', required = false,
  placeholder, ...resto
}, afuera) {
  const { frase } = useFrases();
  const [seVe, setSeVe] = useState(false);
  const [minimo, setMinimo] = useState(null);
  const campo = useRef(null);
  useImperativeHandle(afuera, () => campo.current, []);

  const esNueva = autoComplete === 'new-password';

  /* El número se pregunta y no se escribe. Mientras viaja, el campo se dibuja
     sin largo mínimo y sin aviso: ni uno ni otro son lo que protege —el
     servidor rechaza igual—, y poner un número inventado mientras tanto sería
     peor que no poner ninguno. */
  useEffect(() => {
    if (!esNueva) return undefined;
    let vigente = true;
    conLaRevisionDeClaves()
      .then((Clave) => { if (vigente) setMinimo(Clave.MINIMO); })
      .catch((err) => console.error('No se pudo saber el largo mínimo:', err));
    return () => { vigente = false; };
  }, [esNueva]);

  return (
    <div className="campo-clave">
      <input
        {...resto}
        ref={campo}
        id={id}
        className="campo-clave-campo"
        type={seVe ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        minLength={minimo || undefined}
        /* El aviso del largo mínimo manda donde lo hay, y donde no lo hay manda
           el que escriba la pantalla. Sin esto, una caja que pide la contraseña
           de siempre quedaba muda: el largo mínimo sólo se pone al elegir una
           nueva, y el texto propio se perdía por el camino. */
        placeholder={minimo ? frase('clave.minimo', { cuantos: minimo }) : placeholder}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        className="campo-clave-boton"
        aria-pressed={seVe}
        aria-label={frase(seVe ? 'clave.ocultar_aria' : 'clave.mostrar_aria')}
        onClick={() => {
          setSeVe((estaba) => !estaba);
          /* Se vuelve al campo, como antes: quien apretó el botón estaba
             escribiendo, y dejarle el foco en el botón le obliga a volver a
             pinchar para seguir. */
          if (campo.current) campo.current.focus();
        }}
      >
        {frase(seVe ? 'clave.ocultar' : 'clave.mostrar')}
      </button>
    </div>
  );
});

export default CampoDeClave;
