-- Migration 0008 — Bucket Supabase Storage pour les PDF de documents client.
-- Les PDF (rapport de réparation, bon de dépôt, devis, facture, reçu) sont générés côté
-- atelier puis uploadés via /api/repair-documents (service role). Le client les télécharge
-- ensuite directement depuis n'importe quel appareil via l'URL publique stockée sur le document.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'repair-documents',
  'repair-documents',
  true,
  15728640, -- 15 Mo / fichier
  array['application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "repair_documents_public_read" on storage.objects;
create policy "repair_documents_public_read"
  on storage.objects for select
  using (bucket_id = 'repair-documents');
