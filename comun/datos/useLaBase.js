/* ===================================================
   ESPERAR A QUE LA PUERTA ESTÉ ABIERTA

   Abrir la puerta tarda: hay que traer la biblioteca de la base y los dos
   archivos que la usan. Una pantalla no puede pedir datos mientras eso viaja, y
   tampoco puede quedarse en blanco sin decir nada.

   Así que esto devuelve los cuatro estados de siempre —cargando, error, vacío,
   listo—, y acá el «vacío» no existe como caso aparte: o la puerta abrió o no
   abrió. Mientras carga, la pantalla muestra que está cargando; si no abre, lo
   dice en vez de quedarse muda.

   La pantalla que la use pide `base` recién cuando el estado dice `listo`.
=================================================== */

import { useEffect, useState } from 'react';
import { conLaBase } from './puerta.js';

export function useLaBase() {
  const [estado, setEstado] = useState('cargando');
  const [base, setBase] = useState(null);

  useEffect(() => {
    let vigente = true;
    conLaBase()
      .then((abierta) => {
        if (!vigente) return;
        setBase(abierta);
        setEstado('listo');
      })
      .catch((err) => {
        console.error('No se pudo abrir el acceso a la base:', err);
        if (vigente) setEstado('error');
      });
    return () => { vigente = false; };
  }, []);

  return { estado, base };
}
