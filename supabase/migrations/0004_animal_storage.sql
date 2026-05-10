-- =====================================================================
-- Storage bucket privado para fotos de animales.
-- Acceso de lectura/escritura: miembros de la finca dueña del animal.
-- La ficha pública /t/<slug> usa signed URLs generadas por el server.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('animal-photos', 'animal-photos', false)
on conflict (id) do nothing;

-- Layout de paths: <farm_id>/<animal_id>/<filename>
-- (split_part permite leer el farm_id como primer segmento.)

drop policy if exists "animal-photos read" on storage.objects;
create policy "animal-photos read" on storage.objects for select
  using (
    bucket_id = 'animal-photos'
    and is_farm_member(split_part(name, '/', 1)::uuid)
  );

drop policy if exists "animal-photos write" on storage.objects;
create policy "animal-photos write" on storage.objects for insert
  with check (
    bucket_id = 'animal-photos'
    and is_farm_member(split_part(name, '/', 1)::uuid, array['owner','admin','operator','vet'])
  );

drop policy if exists "animal-photos update" on storage.objects;
create policy "animal-photos update" on storage.objects for update
  using (
    bucket_id = 'animal-photos'
    and is_farm_member(split_part(name, '/', 1)::uuid, array['owner','admin','operator','vet'])
  );

drop policy if exists "animal-photos delete" on storage.objects;
create policy "animal-photos delete" on storage.objects for delete
  using (
    bucket_id = 'animal-photos'
    and is_farm_member(split_part(name, '/', 1)::uuid, array['owner','admin'])
  );
