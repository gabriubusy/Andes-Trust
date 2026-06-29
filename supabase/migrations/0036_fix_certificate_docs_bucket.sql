-- =====================================================================
-- Fix: el bucket 'certificate-docs' no existía (la subida fallaba con
-- "Bucket not found") y las políticas de 0017 usaban is_farm_member(auth.uid(),
-- ...) — pasaban el id del usuario como farm_id, por lo que ninguna subida
-- pasaba el RLS. Path de subida: <farm_id>/<archivo>, igual que animal-photos.
-- =====================================================================

-- 1. Asegurar que el bucket existe (idempotente)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'certificate-docs',
  'certificate-docs',
  true,
  10485760, -- 10 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do nothing;

-- 2. Recrear políticas con el farm_id correcto (primer segmento del path)
drop policy if exists "certificate_docs_public_read"   on storage.objects;
drop policy if exists "certificate_docs_member_insert"  on storage.objects;
drop policy if exists "certificate_docs_member_delete"  on storage.objects;

-- Lectura pública (el bucket es público; el PDF se abre desde el certificado)
create policy "certificate_docs_public_read"
  on storage.objects for select
  using (bucket_id = 'certificate-docs');

-- Solo miembros de la finca dueña pueden subir
create policy "certificate_docs_member_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'certificate-docs'
    and is_farm_member(split_part(name, '/', 1)::uuid, array['owner','admin','vet','operator'])
  );

-- Solo owner/admin pueden borrar
create policy "certificate_docs_member_delete"
  on storage.objects for delete
  using (
    bucket_id = 'certificate-docs'
    and is_farm_member(split_part(name, '/', 1)::uuid, array['owner','admin'])
  );
