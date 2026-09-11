/* ===================================================
   EL CARTEL DE ESTADO DE UN BLOQUE

   Es `pintarCartel` de la página suelta, dicho una vez y en forma de
   componente. Los seis carteles de esta pantalla se pintan igual —el mismo
   fondo y el mismo color del tono, la misma frase pedida por su clave—, así que
   siguen pintándose en un solo lugar.

   **Recibe la clave de la frase, no la frase.** Igual que antes, y por el mismo
   motivo: así un cambio de idioma con el cartel en pantalla lo alcanza solo.

   **Sin tono no hay cartel.** Allá se le ponía la clase `oculto`; acá no se
   dibuja, que es lo mismo visto desde afuera.
=================================================== */

import { useFrases } from '../../frases/ProveedorDeFrases.jsx';

const CLASES = 'p-16 redondeo-10 texto-13 interlineado-16 mb-12';

export default function Cartel({ tono, clave, huecos, clase = CLASES, estilo }) {
  const { frase } = useFrases();
  if (!tono) return null;

  return (
    <div
      className={clase}
      style={{
        background: 'var(--tono-' + tono + '-fondo)',
        color: 'var(--tono-' + tono + '-texto)',
        ...estilo
      }}
    >
      {frase(clave, huecos)}
    </div>
  );
}
