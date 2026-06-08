-- Bucket para documentos adjuntos a certificados (PDFs, imágenes, etc.)
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

-- Lectura pública (para que el PDF se pueda abrir desde el certificado)
create policy "certificate_docs_public_read"
  on storage.objects for select
  using (bucket_id = 'certificate-docs');

-- Solo miembros de la finca pueden subir/borrar
create policy "certificate_docs_member_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'certificate-docs'
    and is_farm_member(auth.uid(), '{owner,admin,vet,operator}'::text[])
  );

create policy "certificate_docs_member_delete"
  on storage.objects for delete
  using (
    bucket_id = 'certificate-docs'
    and is_farm_member(auth.uid(), '{owner,admin}'::text[])
  );
