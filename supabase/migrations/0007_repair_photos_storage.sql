-- Migration 0007 — Bucket Supabase Storage pour les photos atelier (anti-litige).
-- Les uploads passent par la route serveur /api/repair-photos avec SUPABASE_SERVICE_ROLE_KEY
-- (le service role contourne la RLS). Le bucket est public en lecture pour servir les URLs
-- directement dans la fiche réparation ; passer en privé + URLs signées est un durcissement futur.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'repair-photos',
  'repair-photos',
  true,
  10485760, -- 10 Mo / fichier
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lecture publique des objets du bucket (cohérent avec public = true).
drop policy if exists "repair_photos_public_read" on storage.objects;
create policy "repair_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'repair-photos');
