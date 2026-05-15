-- ════════════════════════════════════════════════════════════════════════════
--  Migration 0001 — Workshop snapshots (Option B : hybrid local-first + cloud sync)
-- ════════════════════════════════════════════════════════════════════════════
--
--  Concept :
--   - L'app reste 100% offline-first (Zustand + localStorage).
--   - Chaque atelier peut "Sauvegarder dans le cloud" → snapshot JSON poussé ici.
--   - Chaque atelier peut "Restaurer depuis le cloud" → snapshot récupéré via
--     son `recovery_code` unique (mot de passe humain XX-XX-XX-XX).
--   - 1 snapshot par atelier (upsert sur workshop_id).
--   - Pas d'auth Supabase ; le `recovery_code` fait office de secret partagé.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Table principale ───────────────────────────────────────────────────────
create table if not exists public.workshop_snapshots (
  id               uuid primary key default gen_random_uuid(),
  workshop_id      uuid not null unique,
  recovery_code    text not null unique,
  license_key      text,
  workshop_name    text,
  device_label     text,
  state            jsonb not null,
  state_size_bytes integer not null,
  schema_version   integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Index pour les recherches rapides par recovery_code (login restore)
create index if not exists idx_workshop_snapshots_recovery_code
  on public.workshop_snapshots (recovery_code);

-- Trigger pour updated_at automatique
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_workshop_snapshots_touch on public.workshop_snapshots;
create trigger trg_workshop_snapshots_touch
  before update on public.workshop_snapshots
  for each row execute function public.touch_updated_at();

-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table public.workshop_snapshots enable row level security;

-- Anyone (anonymous) can INSERT a new snapshot.
-- The recovery_code is generated client-side and is the secret.
drop policy if exists "anon_can_insert_snapshot" on public.workshop_snapshots;
create policy "anon_can_insert_snapshot"
  on public.workshop_snapshots
  for insert
  to anon
  with check (true);

-- Anyone (anonymous) can SELECT — but the client must filter by recovery_code.
-- We trust the recovery_code as a shared secret (16-char random, ~10^19 combinations).
drop policy if exists "anon_can_select_snapshot" on public.workshop_snapshots;
create policy "anon_can_select_snapshot"
  on public.workshop_snapshots
  for select
  to anon
  using (true);

-- Anyone can UPDATE — same logic, the client passes the recovery_code in WHERE.
drop policy if exists "anon_can_update_snapshot" on public.workshop_snapshots;
create policy "anon_can_update_snapshot"
  on public.workshop_snapshots
  for update
  to anon
  using (true)
  with check (true);

-- No DELETE for anon — soft-deletes only via UPDATE.

-- ─── Quota / safety ─────────────────────────────────────────────────────────
-- Limite raisonnable : 10 MB par snapshot (largement assez pour un atelier).
alter table public.workshop_snapshots
  add constraint workshop_snapshots_state_size_check
  check (state_size_bytes > 0 and state_size_bytes <= 10 * 1024 * 1024);

-- ─── Vue publique pour stats (optionnel, sans données sensibles) ─────────────
create or replace view public.workshop_snapshots_stats as
select
  count(*)               as total_workshops,
  sum(state_size_bytes)  as total_bytes,
  max(updated_at)        as last_activity_at
from public.workshop_snapshots;

grant select on public.workshop_snapshots_stats to anon;

-- ════════════════════════════════════════════════════════════════════════════
--  Fin de la migration 0001
-- ════════════════════════════════════════════════════════════════════════════
