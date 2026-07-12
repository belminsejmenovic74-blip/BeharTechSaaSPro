-- Behar Tech Pro — Éditeur visuel : historique des versions.
-- Ajoute la liste des versions et la restauration (lecture du snapshot).
-- Aucun changement de schéma de table : les overrides/SiteContent vivent dans
-- le snapshot jsonb existant de public.cms_versions.

-- Liste des versions (brouillons + publications), plus récentes d'abord.
create or replace function public.cms_list_versions(session_token text)
returns table (id uuid, version_type text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cms_require_admin_session(session_token);

  return query
    select v.id, v.version_type, v.created_at
    from public.cms_versions v
    order by v.created_at desc
    limit 100;
end;
$$;

-- Restaure une version : renvoie son snapshot (l'appelant décide d'enregistrer/publier).
create or replace function public.cms_restore_version(session_token text, version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  snap jsonb;
begin
  perform public.cms_require_admin_session(session_token);

  select snapshot into snap
  from public.cms_versions
  where id = version_id;

  if snap is null then
    raise exception 'cms_version_not_found';
  end if;

  return snap;
end;
$$;

grant execute on function public.cms_list_versions(text) to anon, authenticated;
grant execute on function public.cms_restore_version(text, uuid) to anon, authenticated;
