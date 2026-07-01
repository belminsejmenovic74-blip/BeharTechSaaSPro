-- ─────────────────────────────────────────────────────────────────────────────
--  Public customer tracking — table + accès anonyme (page de suivi PUBLIQUE)
-- ─────────────────────────────────────────────────────────────────────────────
--  La page /suivi/:shopSlug/:trackingId est publique (aucune connexion requise).
--  Elle lit directement cette table avec la clé `anon` (cf. src/lib/supabase/client.ts,
--  `persistSession: false` → full anonymous). Contrairement aux tables métier
--  (qui passent par des API routes en service role, cf. 0005), cette table est
--  lue ET écrite directement par le client anonyme du navigateur.
--
--  `public_data` est un DTO déjà filtré (PublicRepairDto, cf. src/lib/public-dtos.ts) :
--  il n'expose que le nom d'affichage du client (client.displayName) et les
--  coordonnées de la BOUTIQUE — jamais le téléphone / email / adresse du client.
--  Cette migration est idempotente : elle peut être rejouée sans risque.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.public_tracking_repairs (
  tracking_id   text primary key,
  workshop_id   text,
  shop_slug     text,
  repair_number text,
  status        text,
  device        text,
  public_data   jsonb not null,
  updated_at    timestamptz not null default now()
);

-- La page tente une recherche par tracking_id OU par numéro de dossier.
create index if not exists idx_public_tracking_repairs_repair_number
  on public.public_tracking_repairs (repair_number);

alter table public.public_tracking_repairs enable row level security;

-- ── Lecture anonyme : indispensable pour la page de suivi publique ──────────────
drop policy if exists "public_tracking_anon_select" on public.public_tracking_repairs;
create policy "public_tracking_anon_select"
  on public.public_tracking_repairs
  for select
  to anon, authenticated
  using (true);

-- ── Écriture anonyme : la synchro cloud (syncPublicTrackingRepairsToCloud) écrit
--    directement depuis le client anon. On garde l'écriture ouverte au rôle anon
--    pour ne pas casser la synchro existante. ─────────────────────────────────────
drop policy if exists "public_tracking_anon_insert" on public.public_tracking_repairs;
create policy "public_tracking_anon_insert"
  on public.public_tracking_repairs
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "public_tracking_anon_update" on public.public_tracking_repairs;
create policy "public_tracking_anon_update"
  on public.public_tracking_repairs
  for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.public_tracking_repairs to anon, authenticated;
