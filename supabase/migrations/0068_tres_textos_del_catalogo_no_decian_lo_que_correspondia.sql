/* ===================================================
   TRES TEXTOS DEL CATÁLOGO NO DECÍAN LO QUE CORRESPONDÍA

   Pendiente 86. Tres claves de `public.vocabulario_items` traían un texto en
   castellano escrito distinto de sus vecinos, sin motivo:

   - `patologia/oncologico` decía «Paciente oncológico» en singular, mientras
     los de al lado —`postrados`, y las demás patologías de la lista— dicen
     «Pacientes» en plural.
   - `nivel_reputacion/plata` decía «Asistente senior», que mete una palabra
     inglesa sin aprobar adentro de una frase en castellano, existiendo la
     forma castellana. Pasa a decir «Asistente con experiencia», que sigue el
     mismo patrón adjetivo que sus vecinos: «verificado» y «destacado».
   - `certificacion/curso_gerontologico` nombra gerontología pero el texto
     decía «Curso general de asistente de cuidado domiciliario», que es otra
     cosa. La clave es dato guardado y no se renombra, así que se corrige el
     texto para que hable de lo que la clave nombra.

   Sólo se toca `i18n->>'es-AR'` y, en el tercer caso, también `en` y `pt-BR`
   —los otros dos textos ya hablaban de gerontología en sus idiomas—. El resto
   de cada fila queda igual.
=================================================== */

update public.vocabulario_items i
set i18n = jsonb_set(i.i18n, '{es-AR}', '"Pacientes oncológicos"'::jsonb)
from public.vocabularios v
where i.vocabulario_id = v.id
  and v.clave = 'patologia' and i.clave = 'oncologico' and i.tenant_id is null;

update public.vocabulario_items i
set i18n = jsonb_set(i.i18n, '{es-AR}', '"Asistente con experiencia (Plata)"'::jsonb)
from public.vocabularios v
where i.vocabulario_id = v.id
  and v.clave = 'nivel_reputacion' and i.clave = 'plata' and i.tenant_id is null;

update public.vocabulario_items i
set i18n = '{"en": "Course in gerontology for home care", "es-AR": "Curso de gerontología para cuidado domiciliario", "pt-BR": "Curso de gerontologia para cuidado domiciliar"}'::jsonb
from public.vocabularios v
where i.vocabulario_id = v.id
  and v.clave = 'certificacion' and i.clave = 'curso_gerontologico' and i.tenant_id is null;
