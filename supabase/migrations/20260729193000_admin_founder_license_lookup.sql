-- Permet au serveur d'administration de renvoyer une invitation fondateur
-- sans faire tourner la clé existante, et de révéler cette clé à l'admin.

create or replace function public.admin_get_founder_license_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_result jsonb;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'license_id', invitation.license_id,
    'license_key', secret.license_key,
    'status', invitation.status,
    'workshop_name', invitation.workshop_name
  )
  into v_result
  from public.clerk_client_invitations as invitation
  join private.license_secrets as secret on secret.license_id = invitation.license_id
  where lower(invitation.email) = v_email
  order by invitation.created_at desc
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.admin_get_founder_license_by_email(text)
  from public, anon, authenticated;
grant execute on function public.admin_get_founder_license_by_email(text)
  to service_role;

create or replace function public.admin_get_founder_license_secret(p_license_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_license_key text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  select secret.license_key
  into v_license_key
  from private.license_secrets as secret
  join public.license_keys as license on license.id = secret.license_id
  where secret.license_id = p_license_id
    and license.founder_access is true
  limit 1;

  return v_license_key;
end;
$$;

revoke all on function public.admin_get_founder_license_secret(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_get_founder_license_secret(uuid)
  to service_role;
