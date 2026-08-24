-- =====================================================================
-- 0006 — Los archivos del legajo
--
-- Los dos depósitos de archivos existían en el proyecto real pero no en
-- ninguna migración: alguien los creó a mano desde el tablero, que es
-- justo lo que prohíbe la regla 9. Y no tenían ni una política, así que
-- `storage.objects` los rechazaba todos: el alta subía los papeles a un
-- lugar donde no podía escribir, y el error se perdía en un `console.warn`
-- (pendiente 19).
--
-- Acá se declaran los dos, con una diferencia que importa:
--
--   * **`avatares` es público.** Es la foto que se muestra en el directorio:
--     si no se puede ver sin sesión, el directorio no tiene fotos.
--   * **`documentos-cuidadores` es privado.** Guarda el documento de
--     identidad, los antecedentes penales, el título y la matrícula. Con el
--     depósito público, cualquiera con la dirección lee el DNI de una
--     persona, y esas direcciones son adivinables. La aplicación pide un
--     enlace temporal cada vez que hay que mostrar uno.
--
-- El camino de cada archivo empieza por la cuenta que lo subió
-- (`<user_id>/<archivo>`), y de ahí sale el permiso: se compara esa primera
-- carpeta contra `auth.uid()`. No hay forma de escribir en la carpeta de otro.
-- =====================================================================

-- --- 1. Los dos depósitos ----------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-cuidadores', 'documentos-cuidadores', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatares', 'avatares', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- --- 2. Cada quien, su carpeta ----------------------------------------------
drop policy if exists "Documentos del legajo, los propios"        on storage.objects;
drop policy if exists "Documentos del legajo, para la Prestadora" on storage.objects;
drop policy if exists "Avatar propio"                             on storage.objects;

create policy "Documentos del legajo, los propios" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'documentos-cuidadores'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documentos-cuidadores'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar propio" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- --- 3. El personal de la Prestadora lee lo de su Prestadora ----------------
-- Lee, y nada más: los papeles los carga la persona, y auditarlos no es
-- editarlos. El alcance sale del legajo, no del archivo: sólo se llega a la
-- carpeta de una cuenta cuyo legajo está en la Prestadora de quien mira.
create policy "Documentos del legajo, para la Prestadora" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documentos-cuidadores'
    and public.es_personal_de_prestadora()
    and exists (
      select 1
        from public.caregivers c
       where c.user_id::text = (storage.foldername(name))[1]
         and c.tenant_id = public.prestadora_actual()
    )
  );
