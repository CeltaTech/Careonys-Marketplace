-- ---------------------------------------------------------------------------
-- LOS CINCO ESTADOS DE UNA VERIFICACIÓN TIENEN NOMBRE, Y EN LOS TRES IDIOMAS
--
-- La tabla `verificaciones_asistente` admite cinco estados desde la migración
-- 0004, escritos en una restricción: `pendiente`, `presentado`, `verificado`,
-- `rechazado` y `vencido` (0004:143). Son claves de la base, no texto: nadie
-- las puede leer en una pantalla y nadie las puede traducir.
--
-- Hasta hoy eso no molestaba porque **ninguna pantalla escribía esa tabla**
-- (pendiente 70): la Prestadora aprueba o rechaza el legajo entero y no tiene
-- dónde marcar papel por papel. La pantalla que lo arregla necesita mostrar los
-- cinco, así que acá se les da nombre, del único modo en que este producto le
-- da nombre a una lista cerrada: un vocabulario.
--
-- **Por qué un vocabulario y no cinco frases.** Una frase suelta se traduce,
-- pero no gobierna nada. Un vocabulario sí: `verificar_claves.mjs` puede
-- entonces mirar la columna `estado` y avisar el día que una migración escriba
-- un sexto valor que nadie declaró. Es exactamente lo que le pasó a
-- `avisos.schedule_type`, que junta cuatro formas de decir lo mismo
-- porque cada pantalla escribió la suya (pendiente 31).
--
-- **La palabra visible de `verificado` es «Comprobado», y no es un descuido.**
-- Es la que ya usa el vocabulario `comprobacion` —el que la Familia ve en el
-- directorio, «Domicilio comprobado», «Título comprobado» (0039:292)—. Quien
-- marca y quien mira tienen que estar diciendo lo mismo.
-- ---------------------------------------------------------------------------

insert into public.vocabularios (tenant_id, clave, i18n, cerrada, orden)
values (null, 'estado_verificacion', '{"en": "State of a verification in the personal file", "es-AR": "Estado de una verificación del legajo", "pt-BR": "Estado de uma verificação do cadastro"}'::jsonb, true, 25)
on conflict (clave) where tenant_id is null do nothing;

insert into public.vocabulario_items
  (tenant_id, vocabulario_id, clave, i18n, extra, orden, i18n_pendiente, nota)
select null, v.id, x.clave, x.i18n, x.extra, x.orden, x.pendiente, x.nota
  from public.vocabularios v
  cross join (values
  ('pendiente', '{"en": "Not submitted", "es-AR": "Sin presentar", "pt-BR": "Não apresentado"}'::jsonb, '{}'::jsonb, 1, false, null),
  ('presentado', '{"en": "Submitted, not checked", "es-AR": "Presentado, sin comprobar", "pt-BR": "Apresentado, sem comprovar"}'::jsonb, '{}'::jsonb, 2, false, null),
  ('verificado', '{"en": "Checked", "es-AR": "Comprobado", "pt-BR": "Comprovado"}'::jsonb, '{}'::jsonb, 3, false, null),
  ('rechazado', '{"en": "Rejected", "es-AR": "Rechazado", "pt-BR": "Recusado"}'::jsonb, '{}'::jsonb, 4, false, null),
  ('vencido', '{"en": "Expired", "es-AR": "Vencido", "pt-BR": "Vencido"}'::jsonb, '{}'::jsonb, 5, false, null)
  ) as x(clave, i18n, extra, orden, pendiente, nota)
 where v.clave = 'estado_verificacion' and v.tenant_id is null
on conflict (vocabulario_id, clave) where tenant_id is null do nothing;

-- Y se comprueba que quedaron los cinco. Sin esto, una migración que no insertó
-- nada —porque el `on conflict` la mandó a dormir, o porque el `where` no
-- encontró el vocabulario— termina en verde igual que una que funcionó.
do $$
declare
  cuantos integer;
begin
  select count(*) into cuantos
    from public.vocabulario_items i
    join public.vocabularios v on v.id = i.vocabulario_id
   where v.clave = 'estado_verificacion' and v.tenant_id is null;

  if cuantos <> 5 then
    raise exception 'El vocabulario de estados tendría que tener 5 opciones y tiene %', cuantos;
  end if;

  raise notice 'Los cinco estados de una verificación ya tienen nombre.';
end $$;

notify pgrst, 'reload schema';
