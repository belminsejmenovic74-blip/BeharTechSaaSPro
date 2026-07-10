-- Migration 0019 — Verrouillage de l'accès aux snapshots d'atelier
--
-- Avant : les rôles anonymes pouvaient lire, modifier et créer n'importe quel
-- snapshot (policies `using (true)`). Un tiers pouvait donc récupérer ou écraser
-- les données de tous les ateliers via l'API publique.
--
-- Après : aucun accès direct anonyme à la table. Toute lecture ou écriture passe
-- par des fonctions qui exigent la licence de l'atelier concerné et ne renvoient
-- que la ligne correspondante.

alter table public.workshop_snapshots enable row level security;

drop policy if exists "anon_can_insert_snapshot" on public.workshop_snapshots;
drop policy if exists "anon_can_select_snapshot" on public.workshop_snapshots;
drop policy if exists "anon_can_update_snapshot" on public.workshop_snapshots;

-- Lecture d'un snapshot par sa licence.
create or replace function public.snapshot_pull(p_license_key text)
returns table (
  id               uuid,
  workshop_id      uuid,
  license_key      text,
  workshop_name    text,
  state            jsonb,
  state_size_bytes integer,
  updated_at       timestamptz
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.workshop_id, s.license_key, s.workshop_name,
         s.state, s.state_size_bytes, s.updated_at
  from public.workshop_snapshots s
  where s.license_key_normalized = upper(trim(p_license_key))
  limit 1;
$$;

-- Métadonnées seules (détection d'une version plus récente sur un autre poste).
create or replace function public.snapshot_meta(p_license_key text)
returns table (
  updated_at    timestamptz,
  workshop_name text
)
language sql
security definer
set search_path = public
as $$
  select s.updated_at, s.workshop_name
  from public.workshop_snapshots s
  where s.license_key_normalized = upper(trim(p_license_key))
  limit 1;
$$;

-- Écriture d'un snapshot (crée ou remplace la ligne de la licence).
create or replace function public.snapshot_push(
  p_license_key      text,
  p_workshop_id      uuid,
  p_workshop_name    text,
  p_device_label     text,
  p_state            jsonb,
  p_state_size_bytes integer,
  p_schema_version   integer
)
returns table (
  id               uuid,
  workshop_id      uuid,
  license_key      text,
  workshop_name    text,
  state            jsonb,
  state_size_bytes integer,
  updated_at       timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text := upper(trim(p_license_key));
begin
  if v_norm is null or length(v_norm) = 0 then
    raise exception 'Licence requise.';
  end if;

  return query
  update public.workshop_snapshots s
     set workshop_name    = p_workshop_name,
         device_label     = p_device_label,
         state            = p_state,
         state_size_bytes = p_state_size_bytes,
         schema_version   = coalesce(p_schema_version, 1)
   where s.license_key_normalized = v_norm
  returning s.id, s.workshop_id, s.license_key, s.workshop_name,
            s.state, s.state_size_bytes, s.updated_at;

  if not found then
    return query
    insert into public.workshop_snapshots
      (workshop_id, license_key, workshop_name, device_label,
       state, state_size_bytes, schema_version)
    values
      (coalesce(p_workshop_id, gen_random_uuid()), p_license_key, p_workshop_name,
       p_device_label, p_state, p_state_size_bytes, coalesce(p_schema_version, 1))
    returning workshop_snapshots.id, workshop_snapshots.workshop_id,
              workshop_snapshots.license_key, workshop_snapshots.workshop_name,
              workshop_snapshots.state, workshop_snapshots.state_size_bytes,
              workshop_snapshots.updated_at;
  end if;
end;
$$;

revoke all on function public.snapshot_pull(text) from public;
revoke all on function public.snapshot_meta(text) from public;
revoke all on function public.snapshot_push(text, uuid, text, text, jsonb, integer, integer) from public;

grant execute on function public.snapshot_pull(text) to anon, authenticated;
grant execute on function public.snapshot_meta(text) to anon, authenticated;
grant execute on function public.snapshot_push(text, uuid, text, text, jsonb, integer, integer) to anon, authenticated;
