-- Génère côté serveur un code de transfert éphémère pour un utilisateur Clerk.
-- L'appelant HTTP vérifie d'abord la session Clerk, puis appelle cette fonction
-- avec la clé service_role. La clé de licence ne quitte jamais le serveur.
create or replace function public.admin_create_workshop_handoff(
  p_clerk_user_id text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_workshop_id uuid;
  v_license_id uuid;
  v_license_key text;
begin
  if nullif(trim(p_clerk_user_id), '') is null then
    return null;
  end if;

  select m.workshop_id
    into v_workshop_id
  from public.organization_members m
  where m.clerk_user_id = trim(p_clerk_user_id)
    and m.status = 'active'
  order by (m.role = 'owner') desc, m.created_at
  limit 1;

  if v_workshop_id is null then
    return null;
  end if;

  select l.id, s.license_key
    into v_license_id, v_license_key
  from public.license_keys l
  join private.license_secrets s on s.license_id = l.id
  where l.workshop_id = v_workshop_id
    and l.status in ('active', 'used', 'past_due')
  order by l.created_at desc
  limit 1;

  if v_license_id is null or nullif(v_license_key, '') is null then
    return null;
  end if;

  delete from public.workshop_session_handoffs
  where expires_at <= now() or redeemed_at is not null;

  v_code := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.workshop_session_handoffs(
    code,
    user_id,
    clerk_user_id,
    license_key,
    workshop_id,
    license_id
  ) values (
    v_code,
    null,
    trim(p_clerk_user_id),
    v_license_key,
    v_workshop_id,
    v_license_id
  );

  return v_code;
end;
$$;

revoke all on function public.admin_create_workshop_handoff(text) from public, anon, authenticated;
grant execute on function public.admin_create_workshop_handoff(text) to service_role;
