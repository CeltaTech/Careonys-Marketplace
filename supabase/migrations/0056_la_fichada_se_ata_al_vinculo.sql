-- ---------------------------------------------------------------------------
-- LA FICHADA SE ATA AL VÍNCULO, Y LA FAMILIA LA VE
--
-- La migración 0053 le sacó la fichada de la vista al personal de la
-- Prestadora: mirar la jornada es dirigir el trabajo, y en esta modalidad la
-- Prestadora no lo hace. Al hacerlo dejó el dato sin nadie que lo mirara salvo
-- el propio Asistente, y su propio comentario lo dejó escrito: «La Familia
-- todavía no la ve porque no hay columna que las ate». Es el pendiente 141, y
-- es la mitad operativa que el producto promete acompañar.
--
-- **Lo que ata a las dos personas ya existe y es la conversación.**
-- `conversaciones` (migración 0054) tiene exactamente una fila por par
-- —Familia y Asistente, adentro de una Prestadora—, y es el único lugar del
-- software donde consta que esas dos partes se encontraron. No hace falta
-- inventar ninguna otra tabla, y sobre todo **no hace falta guardar ningún
-- trato**: la conversación no dice que hayan arreglado nada ni en qué
-- condiciones. Dice que hablaron. La fichada se cuelga de ahí y no de un
-- contrato que este software no conoce ni va a conocer.
--
-- **La columna es opcional a propósito.** El Asistente puede fichar sin decir
-- para quién, que es lo único que podía hacer hasta hoy, y las fichadas ya
-- escritas se quedan como están. Cuando la marca, la Familia de ese vínculo la
-- ve; cuando no, no la ve nadie más que él. Nada se bloquea por no completarla.
--
-- **Y no puede colgarla de una conversación ajena.** El `with check` de su
-- política ya exigía que el legajo fuera el suyo; ahora exige además que la
-- conversación, si la hay, sea una en la que él es el Asistente. Sin eso
-- cualquiera podría hacerle aparecer a una Familia una fichada que no es de su
-- Asistente, que es exactamente el aviso equivocado que la mitad operativa
-- promete no dar.
--
-- **La Familia lee y no escribe.** Su política es `for select` y nada más: la
-- fichada la marca quien trabaja. Y no hace falta ninguna función que se
-- saltee la RLS, porque la fila entera de `clock_ins` es lo que la Familia
-- puede ver —hora, tipo y ubicación de la jornada que paga— y no hay adentro
-- ningún dato de contacto de nadie.
--
-- Correr esto dos veces no falla.
-- ---------------------------------------------------------------------------


-- ── 1. La conversación puede ser destino de una clave foránea con Prestadora ──
-- Misma forma que la 0054 le dio al aviso y al legajo: la clave lleva el par
-- para que la base misma impida atar dos filas de Prestadoras distintas.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'conversacion_unica_por_prestadora') then
    alter table public.conversaciones
      add constraint conversacion_unica_por_prestadora unique (id, tenant_id);
  end if;
end $$;


-- ── 2. La columna ────────────────────────────────────────────────────────────
alter table public.clock_ins
  add column if not exists conversacion_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'la_fichada_es_de_un_vinculo_de_la_misma_prestadora') then
    alter table public.clock_ins
      add constraint la_fichada_es_de_un_vinculo_de_la_misma_prestadora
      foreign key (conversacion_id, tenant_id)
      references public.conversaciones(id, tenant_id) on delete set null;
  end if;
end $$;

create index if not exists clock_ins_conversacion_idx
  on public.clock_ins(conversacion_id, created_at desc);

comment on column public.clock_ins.conversacion_id is
  'El vínculo con la Familia para la que fue esta jornada, o vacío si el Asistente no lo dijo. Apunta a la conversación, que es el único lugar donde consta que esas dos partes se encontraron: no guarda ningún trato ni ninguna condición (migración 0056).';


-- ── 3. Quién la escribe: el Asistente, y sólo de un vínculo suyo ─────────────
drop policy if exists "Fichadas del Asistente" on public.clock_ins;
create policy "Fichadas del Asistente" on public.clock_ins
  for all to authenticated
  using      (tenant_id = public.prestadora_actual()
              and caregiver_id = public.legajo_propio())
  with check (tenant_id = public.prestadora_actual()
              and caregiver_id = public.legajo_propio()
              and (conversacion_id is null
                   or exists (select 1
                                from public.conversaciones c
                               where c.id           = conversacion_id
                                 and c.tenant_id    = public.prestadora_actual()
                                 and c.caregiver_id = public.legajo_propio())));


-- ── 4. Quién la lee: además, la Familia de ese vínculo ───────────────────────
-- Las políticas se suman, no se pisan: esta le agrega a la Familia las filas de
-- sus vínculos sin quitarle al Asistente ninguna de las suyas. Una fichada sin
-- vínculo no la alcanza ninguna de estas dos cláusulas más que la del Asistente.
drop policy if exists "Fichadas del vínculo, para la Familia" on public.clock_ins;
create policy "Fichadas del vínculo, para la Familia" on public.clock_ins
  for select to authenticated
  using (tenant_id = public.prestadora_actual()
         and conversacion_id is not null
         and exists (select 1
                       from public.conversaciones c
                      where c.id         = conversacion_id
                        and c.tenant_id  = public.prestadora_actual()
                        and c.familia_id = auth.uid()));

comment on table public.clock_ins is
  'La fichada de entrada y salida del Asistente, con su ubicación. La marca él, y la ve él y la Familia del vínculo que haya marcado (migración 0056). El personal de la Prestadora no la ve: mirar la jornada es dirigir el trabajo, y en esta modalidad no lo hace (migración 0053).';


notify pgrst, 'reload schema';
