# Términos nuevos de Careonys Marketplace

> **Acá no está el glosario.** El glosario es `..\..\..\docs\GLOSARIO_PRODUCTOS_CAREONYS.md`, es
> único y **no se copia**. Se abre a mano al empezar.
>
> Este archivo tiene sólo lo que **este** producto necesitó y allá no existía. Cada término se
> propone acá antes de usarlo en código. Cuando los dos productos se fusionen, esta lista es la
> que se revisa para decidir cuáles suben al glosario común.

| Término propuesto | Qué es | Estado |
|---|---|---|
| **modalidad de este producto** — identificador: `modalidad` | La modalidad de trabajo en la que el Cliente Contratante busca entre los Asistentes de su Prestadora, compara, elige y contrata, en vez de recibir una asignación. Es una de las tres, junto con prestación directa y subcontratación. Ejemplo: una Familia entra, filtra por zona y por patología, mira tres perfiles y pide contratar a uno. No es el Vínculo: el Vínculo es la relación de un Asistente con su Prestadora, y existe igual en las tres modalidades | **Aprobado** por el Desarrollador el 24 de agosto de 2026 |
| **Legajo** — identificador: `legajo` | Todo lo que la Prestadora guarda de un Asistente: sus datos, sus estudios, sus papeles, su experiencia y las verificaciones que le fue haciendo. Es el currículum con los respaldos adjuntos, y es lo que la Prestadora mira para decidir si esa persona puede trabajar. La persona lo completa una vez y después lo mantiene al día. Nadie de afuera lo ve entero, y hay partes que no salen nunca | **Aprobado** por el Desarrollador el 24 de agosto de 2026 |
| **Perfil** | Lo que se muestra de un Asistente a quien lo está buscando: su nombre, su foto, su género, su zona, qué atiende, su precio por hora y qué se le comprobó —el género y las comprobaciones se sumaron el 26 de agosto de 2026—. Sale del legajo pero no es el legajo: es la parte elegida para mostrar, y el Asistente decide si se publica o no. Es el mismo sentido que tiene la palabra en cualquier red social: el perfil es lo que se ve, y también dónde se elige qué se ve | **Aprobado** por el Desarrollador el 24 de agosto de 2026 |
| **Aviso** — identificador: `aviso` | Lo que una Familia publica cuando necesita un Asistente: qué necesita, en qué zona, qué días y en qué turnos. Queda publicado para que los Asistentes lo vean. **Es una cosa guardada, no algo que alguien hace**: el aviso sigue existiendo aunque nadie lo mire. Ejemplo: una Familia publica que necesita acompañamiento los martes y jueves a la mañana en Caballito. No es la Búsqueda: la Búsqueda es la acción, el aviso es lo que queda. Cuando lo que se quiere decir es que el sistema le informa algo a alguien —que llegó el Asistente, que alguien se postuló—, la palabra es **notificación**, nunca aviso | **Aprobado** por el Desarrollador el 25 de agosto de 2026, cuando ordenó «renombra todo lo que haya que renombrar, no puede ser que tengamos distintos nombres para la misma cosa» |
| **Búsqueda** — identificador: `busqueda` | La acción de buscar, y la hacen los dos lados de tres maneras: una Familia busca entre los Asistentes disponibles; una Familia también busca cuando publica un aviso y espera que alguien se ofrezca; y un Asistente busca cuando revisa los avisos publicados hasta encontrar uno que le cuadre. **Es lo que alguien hace, no algo que quede guardado**, y por eso no nombra ninguna tabla. Ejemplo: la Familia filtra por zona y patología, mira tres perfiles y no elige ninguno — hubo Búsqueda y no quedó nada | **Aprobado** por el Desarrollador el 25 de agosto de 2026, cuando ordenó «renombra todo lo que haya que renombrar, no puede ser que tengamos distintos nombres para la misma cosa» |
| **Aspirante** | Un Asistente que todavía no tiene el tilde de validación de su Prestadora, así que no aparece en ningún directorio público ni lo ve ninguna Familia. No es una clase de persona distinta: es el mismo Asistente, antes de que su legajo termine de comprobarse. Ejemplo: alguien carga su legajo completo y queda como Aspirante hasta que la Prestadora revisa sus papeles y lo valida | **Aprobado** por el Desarrollador el 26 de agosto de 2026, al confirmar que la palabra ya se usa y que un Aspirante nunca es visible para una Familia |

**Dos nombres, y a propósito.** En pantalla, en documentos y en la charla se dice **modalidad de
contrataciones**, que es lo que la gente entiende. En tablas, columnas, claves de traducción y
nombres de módulo va `modalidad`, corto y sin ruido. Es el mismo criterio que el glosario común ya usa con
Cliente Contratante, cuyo identificador es `contratante`.

**Por qué `modalidad` y no las otras.** Una modalidad de trabajo es, en castellano corriente, el lugar donde
una parte publica lo que ofrece, la otra lo que necesita, y se encuentran: es exactamente esto.
`contratacion` a secas se descartó porque se lee como si la plataforma contratara al Asistente, que
es justo lo que no pasa y lo que no conviene insinuar. `mercado` se descartó por ser la traducción
literal de `marketplace`, la palabra que en las tablas de Careonys nombra otra cosa. `directorio`
nombra una pantalla, no la modalidad.

**El legajo y el perfil no son la misma cosa, y confundirlos ya hizo daño.** El legajo es lo que la
persona entrega y la Prestadora audita; el perfil es la cara visible de una parte de eso, la que el
Asistente eligió mostrar. Quien completa un formulario largo con documentos y certificados
está completando su legajo, no su perfil, y decirle «complete su perfil» le hace esperar otra cosa. La línea de comandos
las mezcló durante meses, en pantalla y en documentos, hasta que el Desarrollador lo marcó el 24 de
agosto de 2026.

**El perfil va sin adjetivo.** Se escribió «perfil público» un tiempo, para separarlo de la parte que
no se muestra. No hace falta: esa parte no es un perfil privado, es el legajo. Lo que está en el
perfil está para mostrarse, y con eso alcanza.

**Cuidado con una tercera cosa que hoy también se llama perfil.** En el código, `perfil` nombra
además la ficha de la cuenta: quién es la persona que inició sesión, con qué rol entra y de qué
Prestadora es. Está guardada así desde el principio y no se renombra, porque «lo que se guarda para siempre se nombra por lo que hace» dice que
un identificador guardado se queda como está. En texto visible, entonces, «perfil» es siempre lo que
se muestra de un Asistente; la ficha de la cuenta no se nombra en pantalla.

**Cómo se agrega uno:** pasa las cinco preguntas del glosario de la empresa (`..\..\..\CLAUDE.md`) y se escribe acá con
su definición según los criterios de ahí. Recién entonces se usa en código.

**«Registrarse» y «postularse» son dos actos distintos, no dos sentidos de una misma palabra.**
Conviene decirlo por lo que las palabras significan y no por cómo se venían usando. **Registrar**
es asentar algo en un registro: el Asistente carga sus datos y quedan guardados. **Postularse** es
ofrecerse uno mismo para algo, y es una palabra de uso corriente que sirve en cualquier contexto:
uno se postula a una Prestadora igual que se postula a un aviso. Lo que cambia no es el verbo sino
a qué se ofrece la persona.

**De ahí que ninguna de las dos necesite entrada en este glosario, y que el problema fuera otro.**
La pantalla que carga el legajo se llamaba `postulacion-asistente.html` y decía «Postularme como
Asistente», pero lo que hace es guardar datos: la palabra estaba equivocada, no ambigua. El 25 de
agosto de 2026 pasó a llamarse `registrar-asistente.html` y a decir «Registrarme como Asistente»,
y con ella cambiaron las 86 referencias al archivo, los 29 enlaces que la nombraban, los ocho
textos de las pantallas y las cinco menciones de los documentos que usaban «postulación» para
hablar de cargar datos. **Donde la palabra ya estaba bien puesta no se tocó**: en `index.html` y
en `solicitar-asistente.html`, los Asistentes se postulan a un aviso, que es exactamente
ofrecerse para algo; en `docs/terminos_y_condiciones_asistentes.md:25` el Asistente se postula
para integrar el plantel de una Prestadora, que también lo es; y en `docs/MODULOS.md` y
`docs/ALCANCE.md` la palabra aparece dentro de la lista de términos de esta modalidad que el
`CLAUDE.md` de este producto prohíbe en un módulo compartido, donde nombra la postulación a un aviso.

**Dos documentos conservan la palabra vieja y así se quedan.** `docs/INVENTARIO.md` y
`docs/PLAN_ACCESO.md` son fotos fechadas —del 22 y del 24 de agosto de 2026—, y en esos días la
pantalla de verdad se llamaba así. Corregirles el relato sería falsear lo que decían. Es el
mismo motivo por el que `scripts/verificar_referencias.mjs` no les revisa los renglones citados,
escrito en `scripts/citas.mjs:31`. **Sí se les cambió el nombre del archivo**,
que no es relato sino un puntero: una foto que remite a un archivo inexistente no le sirve a
nadie. El relato quedó intacto, así que ahí adentro «postulación» sigue nombrando lo que en esos
días se llamaba así.
