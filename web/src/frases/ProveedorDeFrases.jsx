/* ===================================================
   LAS FRASES, PARA TODA LA PANTALLA

   Una pantalla pide una frase por su clave y recibe el texto en el idioma que
   corresponda:

       const { frase } = useFrases();
       <h1>{frase('acompanamiento.titulo')}</h1>
       <p>{frase('examen.intentos', { cuantos: 3 })}</p>

   Tres cosas que este archivo resuelve y que conviene tener presentes:

   **Mientras el archivo de frases viaja, no se dibuja nada.** El lector suelto
   dejaba escrito el castellano adentro de la página y lo reemplazaba al llegar;
   acá no hay dónde escribirlo. Así que se espera, y mientras tanto se muestra
   el estado «cargando», que es uno de los cuatro que toda pantalla que carga
   datos tiene que tener.

   **Si el archivo no llega, igual se ve algo.** El lector guarda adentro un
   puñado de frases de arranque y devuelve la cadena vacía para el resto. Una
   pantalla en castellano es peor que una en el idioma que se pidió, y muchísimo
   mejor que una en blanco.

   **Cambiar de idioma no recarga la pantalla.** Se le pide al lector, y cuando
   termina se vuelve a dibujar. La elección queda guardada para las próximas
   visitas.
=================================================== */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Catalogo, IDIOMAS } from './lector.js';

const Frases = createContext(null);

export function ProveedorDeFrases({ children }) {
  const [idioma, setIdioma] = useState(Catalogo.idioma);
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    let vigente = true;
    Catalogo.cargarFrases()
      .then(() => { if (vigente) setEstado('listo'); })
      .catch(() => { if (vigente) setEstado('error'); });
    return () => { vigente = false; };
  }, []);

  const valor = useMemo(() => ({
    idioma,
    idiomas: IDIOMAS,
    estado,
    frase: (clave, huecos) => Catalogo.frase(clave, huecos),
    async cambiarIdioma(nuevo) {
      await Catalogo.cambiarIdioma(nuevo);
      setIdioma(Catalogo.idioma);
    }
  }), [idioma, estado]);

  /* Ni el texto en castellano ni la pantalla en blanco: el estado «cargando»
     que el producto ya usa en todos lados. Dura lo que tarda un archivo. */
  if (estado === 'cargando') return null;

  return <Frases.Provider value={valor}>{children}</Frases.Provider>;
}

export function useFrases() {
  const valor = useContext(Frases);
  if (!valor) throw new Error('Falta el proveedor de frases arriba de esta pantalla');
  return valor;
}
