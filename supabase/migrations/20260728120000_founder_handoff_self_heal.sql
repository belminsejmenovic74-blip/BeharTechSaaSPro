-- Handoff portail auto-réparant pour les clients fondateurs.
--
-- Problème : admin_create_workshop_handoff résolvait l'atelier UNIQUEMENT via
-- public.organization_members. Or cette adhésion n'est créée que par
-- admin_provision_clerk_user, exécuté côté portail APRÈS l'inscription. Si ce
-- provisionnement n'a pas (encore) tourné pour ce compte Clerk — ce qui arrive
-- même pour une adresse totalement neuve invitée depuis /admin/licenses — le
-- handoff ne trouvait aucun rattachement et renvoyait un 409
-- « Aucune licence active n'est rattachée à votre compte », alors que la licence
-- fondateur existe bel et bien (créée par admin_prepare_clerk_founder_client).
--
-- Correctif : si aucune adhésion active n'est trouvée mais qu'une invitation
-- fondateur en attente correspond à l'e-mail du compte, on consomme cette
-- invitation via le provisionnement canonique (source de vérité unique), puis on
-- ré-évalue. On ne se rabat JAMAIS sur une invitation déjà acceptée par un autre
-- compte, et sans invitation correspondante on renvoie toujours le 409 propre.
--
-- La nouvelle signature ajoute p_email (défaut null) : rétro-compatible, les
-- anciens appels à un seul argument continuent de fonctionner sans auto-réparer.

drop function if exists public.admin_create_workshop_handoff(text);

create or replace function public.admin_create_workshop_handoff(
  p_clerk_user_id text,
  p_email text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_clerk_id text := nullif(trim(coalesce(p_clerk_user_id, '')), '');
  v_email text := lower(trim(coalesce(p_email, '')));
  v_workshop_id uuid;
  v_license_id uuid;
  v_license_key text;
  v_invitation_id uuid;
begin
  if v_clerk_id is null then
    return null;
  end if;

  select m.workshop_id
    into v_workshop_id
  from public.organization_members m
  where m.clerk_user_id = v_clerk_id
    and m.status = 'active'
  order by (m.role = 'owner') desc, m.created_at
  limit 1;

  -- Auto-réparation : aucun rattachement mais une invitation fondateur attend ce
  -- compte. On la consomme via le provisionnement canonique puis on ré-évalue.
  if v_workshop_id is null
     and v_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    select i.id
      into v_invitation_id
    from public.clerk_client_invitations i
    where lower(i.email) = v_email
      and i.status in ('pending', 'accepted')
      and (nullif(i.clerk_user_id, '') is null or i.clerk_user_id = v_clerk_id)
    order by (i.status = 'pending') desc, i.created_at desc
    limit 1;

    if v_invitation_id is not null then
      perform public.admin_provision_clerk_user(v_clerk_id, v_email, null, null);
      select m.workshop_id
        into v_workshop_id
      from public.organization_members m
      where m.clerk_user_id = v_clerk_id
        and m.status = 'active'
      order by (m.role = 'owner') desc, m.created_at
      limit 1;
    end if;
  end if;

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
    v_clerk_id,
    v_license_key,
    v_workshop_id,
    v_license_id
  );

  return v_code;
end;
$$;

revoke all on function public.admin_create_workshop_handoff(text, text) from public, anon, authenticated;
grant execute on function public.admin_create_workshop_handoff(text, text) to service_role;
