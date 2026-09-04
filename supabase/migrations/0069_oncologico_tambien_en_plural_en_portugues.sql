/* ===================================================
   ONCOLÓGICO TAMBIÉN EN PLURAL EN PORTUGUÉS

   La 0068 pluralizó `patologia/oncologico` en `es-AR` para que dijera lo mismo
   que sus vecinos —«Pacientes anticoagulados», «Pacientes postrados»— pero
   dejó `pt-BR` en singular. El texto en portugués tiene el mismo defecto por
   el mismo motivo, así que se pluraliza igual.
=================================================== */

update public.vocabulario_items i
set i18n = jsonb_set(i.i18n, '{pt-BR}', '"Pacientes oncológicos"'::jsonb)
from public.vocabularios v
where i.vocabulario_id = v.id
  and v.clave = 'patologia' and i.clave = 'oncologico' and i.tenant_id is null;
