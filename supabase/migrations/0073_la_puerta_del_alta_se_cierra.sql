-- =====================================================================
-- 0073 — La puerta del alta se cierra
-- =====================================================================
--
-- Qué estaba mal
-- --------------
-- `data/catalogo-verificaciones.json` dice, desde el 24 de agosto de 2026,
-- que el documento de identidad «frena el alta». La migración 0061 cerró la
-- puerta `publicacion` —penales, salud, y matrícula y título cuando el tipo
-- de Asistente los exige— y dejó la de `alta` sin cerrar a propósito, con la
-- pregunta anotada en el pendiente 143: cerrarla tal como está escrita
-- —esperando que la Prestadora apruebe el documento— es un candado que no
-- se puede abrir, porque aprobarlo es el paso 2 y el alta es el paso 1.
--
-- El Desarrollador contestó la pregunta el 4 de septiembre de 2026: no hace
-- falta el juicio de la Prestadora para cerrar esta puerta. Alcanza con que
-- el software compruebe, solo, lo rutinario —que el papel llegó—, y dejarle
-- a la Prestadora lo que sí es suyo —confirmar que la persona es quien dice
-- ser, y todo lo demás que sea análisis subjetivo— para más adelante, en la
-- validación, junto con las otras seis verificaciones, antes de la puerta
-- `publicacion`. Hasta que ese juicio llega, el legajo es de un Aspirante;
-- con el ok de la Prestadora pasa a integrar el directorio de Asistentes.
-- Ninguna de las dos cosas es una columna nueva: `verification_status` ya
-- nace en `en_revision` —migración 0047— y ahí es exactamente donde queda
-- un Aspirante hasta que la Prestadora lo pasa a `validado_prestadora`.
--
-- Qué hace esta migración
-- -----------------------
-- Cierra la puerta `alta` del mismo lado que la 0061 cerró la de
-- `publicacion`: leyendo `extra.puerta` de `vocabulario_items`, no una
-- palabra escrita a mano acá. Hoy sólo `dni` tiene `puerta: alta`, pero el
-- disparador no lo sabe por su nombre: pregunta por la puerta y por
-- cualquier papel de `caregivers.documents` que declare esa puerta y no haya
-- llegado. El día que se agregue otro, es una fila y no una migración.
--
-- «Llegó» es lo único que se comprueba: que `caregivers.documents` tenga esa
-- clave y no valga ni vacío ni `pendiente` —el mismo valor que
-- `DocumentosLegajo.ningunoTodavia()` deja en `js/documentos-legajo.js`
-- cuando la persona no adjuntó nada—. **No mira vigencia**: el catálogo no le
-- puso fecha de vencimiento a `dni`, así que no hay nada que expirar todavía;
-- los plazos siguen siendo el pendiente 98, con su plan aparte.
--
-- Corre en el alta, no después: `before insert`. Es el momento exacto en que
-- `registrar-asistente.html` y la aplicación del teléfono terminan de cargar
-- el legajo, y el único de los dos pasos que este candado puede mirar sin
-- esperar al otro.
--
-- Cómo falla
-- ----------
-- Si no hay ninguna fila de `verificacion` con `puerta: alta` —el catálogo
-- vacío, o mal cargado—, no exige nada: no hay nada que exigir. Frente a
-- cualquier otra duda exige, igual que la 0061.
-- =====================================================================


-- ── 1. El disparador ──────────────────────────────────────────────────────
create or replace function public.el_legajo_no_completa_el_alta_sin_sus_papeles()
  returns trigger
  language plpgsql
  set search_path = public
as $$
declare
  v_faltante text;
begin
  select vi.clave
    into v_faltante
    from public.vocabulario_items vi
    join public.vocabularios vo on vo.id = vi.vocabulario_id
   where vo.clave = 'verificacion'
     and vo.tenant_id is null
     -- La Prestadora puede agregar papeles suyos a esta lista, y si lo hace
     -- rigen para su gente y para nadie más. Misma condición que la 0061.
     and (vi.tenant_id is null or vi.tenant_id = new.tenant_id)
     and vi.activo
     and vi.extra->>'puerta' = 'alta'
     and coalesce(new.documents->>vi.clave, '') in ('', 'pendiente')
   order by vi.clave
   limit 1;

  if v_faltante is not null then
    -- El error lleva la clave del papel que falta y nada más: ni el nombre
    -- de la tabla ni el resto del legajo. La pantalla la traduce con
    -- `Texto.claveDeError`, igual que `contacto_bloqueado` desde la 0063.
    raise exception 'alta_sin_papel:%', v_faltante
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.el_legajo_no_completa_el_alta_sin_sus_papeles() is
  'Frena el alta de un Aspirante si a caregivers.documents le falta un papel de los que el vocabulario verificacion marca con puerta "alta" (hoy sólo dni). No mira si ese papel está aprobado por la Prestadora —eso es la validación, más adelante y con otra puerta— ni si venció —eso es el pendiente 98—: sólo si llegó. Corre antes del insert, que es cuando se termina de cargar el legajo.';

drop trigger if exists el_legajo_no_completa_el_alta_sin_sus_papeles on public.caregivers;
create trigger el_legajo_no_completa_el_alta_sin_sus_papeles
  before insert on public.caregivers
  for each row execute function public.el_legajo_no_completa_el_alta_sin_sus_papeles();


-- ── 2. Que esta migración no pueda pasar sin hacer nada ──────────────────
do $$
declare
  con_puerta_alta integer;
begin
  select count(*) filter (where vi.extra->>'puerta' = 'alta')
    into con_puerta_alta
    from public.vocabulario_items vi
    join public.vocabularios vo on vo.id = vi.vocabulario_id
   where vo.clave = 'verificacion'
     and vo.tenant_id is null
     and vi.tenant_id is null;

  if con_puerta_alta <> 1 then
    raise exception
      'La puerta del alta no quedó donde se esperaba: % papeles con puerta alta (se esperaba 1)',
      con_puerta_alta;
  end if;
end $$;


notify pgrst, 'reload schema';
