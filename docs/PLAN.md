# El plan, hasta el final

> **Para qué existe.** Para no volver a pensar lo que ya está pensado. Cada etapa tiene sus pasos,
> cada paso se hace y se tacha, y no se abre una etapa nueva sin cerrar la anterior. Lo que cambia
> de rumbo se corrige acá y no en una conversación.
>
> **Sobre qué está armado.** Sobre la decisión del Desarrollador de que **el Marketplace se muda a
> la base de Careonys** y de que, donde los dos lados resolvieron lo mismo por separado, **la
> definitiva toma lo mejor de cada uno**. El detalle tema por tema está en
> `docs/FUSION_TEMA_POR_TEMA.md`.
>
> **La forma que queda al final**, que es lo que explica el orden de las etapas: el panel, la
> aplicación de la Familia y la del Asistente **son las de Careonys, con funciones habilitadas de a
> partes** —lo ordenó así el Desarrollador: *«Las pwa son las mismas con habilitaciones parciales
> de funciones, no ve todo»*—. El servidor también es el de Careonys, que ya tiene construida la
> parte de cobros del Marketplace. **Lo único que queda propio de este producto es la parte pública
> donde una Familia busca un Asistente.** Y las páginas que **venden** no son de ningún producto:
> son de CeltaTech.

---

## Etapa 1 — Las dos decisiones que trababan todo

**1.1 — Qué cuenta como dato de contacto adentro del chat. ✅ Cerrada.**
El Desarrollador contestó que **cualquier dato que permita que dos personas se comuniquen** lo es,
y agregó por qué importa: en el Marketplace ese dato **es lo que se vende**. Hecho: el chat pasó de
reconocer 5 formas a reconocer 9 —se agregaron el nombre de usuario de otra aplicación, el enlace y
la invitación a seguir la charla en otro lado—, comprobadas contra las dos listas de mensajes de
prueba, aplicadas a la base publicada y publicadas.

**1.2 — Qué ve el Asistente cuando la base le rechaza la fichada. ✅ Cerrada.**
El Desarrollador contestó: **ve un mensaje que le dice por qué**, sacado de una **lista cerrada de
motivos aprobados**, porque no se puede decir todo. Hecho: la lista quedó escrita en los tres
idiomas —tres motivos que se pueden decir y uno para cuando el sistema no dijo nada—, cada rechazo
posible se traduce a uno de ellos con el clasificador que ya tenía el producto, y la pantalla que
ficha muestra el motivo y además si se sigue intentando o si se dejó de intentar. El texto crudo
que devuelve la base ya no se guarda en el teléfono ni llega a ninguna pantalla. Comprobado en vivo
en los tres idiomas.

---

## Etapa 2 — Terminar la comparación antes de mover un solo dato

**2.1 — Cómo protege cada lado lo que guarda. ✅ Cerrada.** Hecho: la segunda pasada quedó escrita
junto a la primera. Lo que sale de ella y manda sobre el resto: **el Marketplace protege adentro de
la base porque no tiene servidor; Careonys protege por el servidor, porque su servidor entra a la
base con una llave que se saltea las reglas de la base.** Así que la mudanza tiene que **elegir por
cuál de los dos caminos van a hablar las pantallas del Marketplace**, y esa elección decide si sus
reglas viajan o hay que escribirlas de nuevo. Además quedaron anotados los dos agujeros propios
—cualquiera entra a la Prestadora que elija, y cinco piezas de la configuración las borra cualquier
miembro— y lo que hay que informarle a Careonys —que no guarda registro de lo que hace la gente de
una Prestadora, y un control de superadmin que se abre en vez de cerrarse—.

**2.2 — ← acá estamos.** El reparto de lo que **no choca**: lo que sólo tiene uno de los dos lados
y hay que decidir si viaja, se queda o se retira.

**2.3** — Ponerle nombre nuevo a las **tres trampas** —las postulaciones, la fichada y el chat—,
que se llaman igual de los dos lados y son cosas distintas. **Los cuatro nombres están propuestos
y esperan que usted diga que sí**, junto a los tres temas, en `docs/FUSION_TEMA_POR_TEMA.md`.
Ninguno se escribe en ningún lado hasta entonces.

---

## Etapa 3 — La misma tecnología que Careonys

Es el cambio más grande y el que se viene postergando. Hoy este producto no tiene nada de lo que
tiene el otro: ni armado, ni pruebas, ni revisor de código.

**3.1** — Descartar primero lo que no se va a portar, para no traducir trabajo que después se tira.

**3.2** — Las pantallas del panel, de la Familia y del Asistente **no se traducen: se apagan**, y
su función pasa a habilitarse adentro de las tres aplicaciones que Careonys ya tiene.

**3.3** — La parte pública —donde una Familia busca un Asistente, se registra y publica lo que
necesita— **sí se rehace acá**, con la misma tecnología, y es lo que queda siendo este producto.

**3.4** — El servidor no se construye: se usa el de Careonys.

---

## Etapa 4 — La mudanza

Se ejecuta **desde Careonys**, no desde acá, y se aprueba de a un punto por vez. Desde acá se deja
todo preparado y escrito.

**4.1** — Los temas donde gana un lado y el otro no aporta nada.
**4.2** — Los temas donde la definitiva se arma con las dos mitades.
**4.3** — Las tres trampas, ya renombradas.
**4.4** — Los nombres de lo guardado que hoy están en inglés pasan a castellano.

---

## Etapa 5 — Los problemas abiertos

Quedan **66**. Varios se cierran solos al mudarse, y no hay que construirlos: que la Prestadora no
tenga dónde configurar nada, el aviso de vencimiento de matrícula, el reporte colgado de donde no
va, y el registro de auditoría. El resto se ordena y se cierra de a uno.

---

## Etapa 6 — Los tres idiomas

Hoy están convertidas 17 de 56 partes. Se termina.

---

## Etapa 7 — Seguridad

La lista propia del producto, más la mitad que se cierra sola al pasar a usar el servidor de
Careonys: el registro de auditoría, el tope de correos, los archivos servidos con dirección firmada
y la validación del lado del servidor.

---

## Etapa 8 — Salir

Pruebas de aislamiento con dos Prestadoras cargadas, la revisión final contra las reglas de la
empresa, y la publicación.

---

## Lo que está frenado por decisión del Desarrollador

- **El escaneo del código QR para el relevo.** No se toca hasta que él lo diga.

## Lo que no se construye acá porque es de CeltaTech

- Las páginas que promocionan y venden, una por producto.
- Que el Marketplace se muestre **dos veces**: solo, y adentro de los paquetes de Careonys, donde
  puede ser el más básico y económico.
- El precio y el tope de los paquetes de contactos. Este producto sólo cuenta.
