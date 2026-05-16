-- Migration 0004 — License key normalized identity
--
-- Objectif :
--   Une licence normalisée = un snapshot = un atelier cloud.
--   Relançable, non destructive, et compatible avec les snapshots existants.

create extension if not exists "pgcrypto";

alter table public.workshop_snapshots
  alter column recovery_code drop not null;

do $$
begin
  if exists (
    select 1
      from public.workshop_snapshots
     where license_key is null
        or length(trim(license_key)) = 0
  ) then
    raise exception 'Migration arrêtée : des snapshots ont une license_key vide ou NULL. Corrigez-les avant de rendre la licence obligatoire.';
  end if;
end;
$$;

alter table public.workshop_snapshots
  alter column license_key set not null;

alter table public.workshop_snapshots
  add column if not exists license_key_normalized text
  generated always as (upper(trim(license_key))) stored;

do $$
begin
  if exists (
    select 1
      from public.workshop_snapshots
     group by license_key_normalized
    having count(*) > 1
  ) then
    raise exception 'Migration arrêtée : plusieurs snapshots utilisent la même license_key_normalized. Lancez le diagnostic doublons avant de créer l''index unique.';
  end if;
end;
$$;

drop index if exists public.idx_workshop_snapshots_license_key_unique;

create unique index if not exists idx_workshop_snapshots_license_key_normalized_unique
  on public.workshop_snapshots (license_key_normalized);

drop index if exists public.idx_workshop_snapshots_recovery_code;
create index if not exists idx_workshop_snapshots_recovery_code
  on public.workshop_snapshots (recovery_code);

alter table public.workshop_snapshots
  drop constraint if exists workshop_snapshots_state_size_check;

alter table public.workshop_snapshots
  add constraint workshop_snapshots_state_size_check
  check (state_size_bytes > 0 and state_size_bytes <= 10 * 1024 * 1024);

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
