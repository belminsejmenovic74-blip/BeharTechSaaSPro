-- Acces direct pour les premiers clients historiques.
-- Le plan technique reste "business" pour reutiliser les droits existants,
-- mais founder_access indique qu'aucun abonnement Stripe n'est attendu.

alter table public.subscriptions
  add column if not exists founder_access boolean not null default false;

alter table public.client_profiles
  add column if not exists founder_access boolean not null default false;

alter table public.license_keys
  add column if not exists founder_access boolean not null default false;

create or replace function public.admin_provision_founder_client(
  p_user_id uuid,
  p_email text,
  p_workshop_name text,
  p_license_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := trim(coalesce(p_workshop_name, ''));
  v_key text := upper(trim(coalesce(p_license_key, '')));
  v_hash text;
  v_license_id uuid;
  v_license_workshop uuid;
  v_snapshot_workshop uuid;
  v_member_workshop uuid;
  v_workshop_id uuid;
  v_token text;
  v_default_state jsonb;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Utilisateur Supabase introuvable';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Adresse e-mail invalide';
  end if;
  if length(v_name) < 2 then
    raise exception 'Nom de l''atelier obligatoire';
  end if;
  if length(v_key) < 12 then
    raise exception 'Cle de licence invalide';
  end if;

  v_hash := encode(extensions.digest(v_key, 'sha256'), 'hex');
  select id, workshop_id into v_license_id, v_license_workshop
  from public.license_keys where key_hash = v_hash limit 1;

  select workshop_id into v_snapshot_workshop
  from public.workshop_snapshots where license_key_normalized = v_key limit 1;

  select workshop_id into v_member_workshop
  from public.organization_members
  where user_id = p_user_id and status = 'active'
  order by (role = 'owner') desc, created_at limit 1;

  if v_license_workshop is not null and v_snapshot_workshop is not null
     and v_license_workshop <> v_snapshot_workshop then
    raise exception 'La licence et les donnees historiques pointent vers deux ateliers differents';
  end if;
  if v_member_workshop is not null
     and coalesce(v_license_workshop, v_snapshot_workshop, v_member_workshop) <> v_member_workshop then
    raise exception 'Ce compte est deja rattache a un autre atelier';
  end if;

  v_workshop_id := coalesce(v_license_workshop, v_snapshot_workshop, v_member_workshop, gen_random_uuid());

  insert into public.workshops(id, name, commercial_name, email)
  values (v_workshop_id, v_name, v_name, v_email)
  on conflict (id) do update set
    name = excluded.name,
    commercial_name = coalesce(nullif(public.workshops.commercial_name, ''), excluded.commercial_name),
    email = excluded.email,
    updated_at = now();

  insert into public.organization_members(workshop_id, user_id, role, status)
  values (v_workshop_id, p_user_id, 'owner', 'active')
  on conflict (workshop_id, user_id) do update set role = 'owner', status = 'active', updated_at = now();

  insert into public.subscriptions(
    workshop_id, plan, requested_plan, status, billing_interval, founder_access,
    current_period_start, current_period_end, cancel_at_period_end
  ) values (
    v_workshop_id, 'business', 'business', 'active', 'month', true,
    now(), null, false
  ) on conflict (workshop_id) do update set
    plan = 'business', requested_plan = 'business', status = 'active',
    founder_access = true, current_period_end = null, cancel_at_period_end = false,
    updated_at = now();

  if v_license_id is null then
    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.license_keys(
      key_hash, key_preview, download_token_hash, status,
      assigned_customer_name, assigned_customer_email, plan, max_devices,
      workshop_id, activated_at, expires_at, limits, founder_access
    ) values (
      v_hash, left(v_key, 12) || '-****',
      encode(extensions.digest(v_token, 'sha256'), 'hex'), 'active',
      v_name, v_email, 'business', 2147483647,
      v_workshop_id, now(), null,
      '{"devices":null,"repairs_per_month":null,"sms_per_month":250}'::jsonb,
      true
    ) returning id into v_license_id;
    insert into private.license_secrets(license_id, license_key)
    values (v_license_id, v_key);
  else
    update public.license_keys set
      workshop_id = v_workshop_id,
      status = 'active',
      assigned_customer_name = v_name,
      assigned_customer_email = v_email,
      plan = 'business',
      max_devices = 2147483647,
      activated_at = coalesce(activated_at, now()),
      expires_at = null,
      limits = '{"devices":null,"repairs_per_month":null,"sms_per_month":250}'::jsonb,
      founder_access = true,
      updated_at = now()
    where id = v_license_id;
    insert into private.license_secrets(license_id, license_key)
    values (v_license_id, v_key)
    on conflict (license_id) do update set license_key = excluded.license_key;
  end if;

  insert into public.client_profiles(
    user_id, workshop_id, email, company_name, onboarding_completed,
    plan, subscription_status, activation_key, repairs_limit, sms_limit,
    devices_limit, renewal_date, founder_access
  ) values (
    p_user_id, v_workshop_id, v_email, v_name, true,
    'business', 'active', v_key, null, 250,
    null, null, true
  ) on conflict (user_id) do update set
    workshop_id = excluded.workshop_id,
    email = excluded.email,
    company_name = excluded.company_name,
    onboarding_completed = true,
    plan = 'business', subscription_status = 'active',
    activation_key = excluded.activation_key,
    repairs_limit = null, sms_limit = 250, devices_limit = null,
    renewal_date = null, founder_access = true, updated_at = now();

  v_default_state := jsonb_build_object(
    'licenseActivated', true,
    'licenseKey', v_key,
    'licensePlan', 'Fondateur',
    'licenseActivatedAt', now(),
    'onboardingCompleted', true
  );
  insert into public.workshop_snapshots(
    workshop_id, recovery_code, license_key, workshop_name, device_label,
    state, state_size_bytes, schema_version
  ) values (
    v_workshop_id, upper(encode(extensions.gen_random_bytes(12), 'hex')),
    v_key, v_name, 'Portail web', v_default_state,
    greatest(1, octet_length(v_default_state::text)), 1
  ) on conflict (workshop_id) do update set
    license_key = excluded.license_key,
    workshop_name = excluded.workshop_name,
    state = public.workshop_snapshots.state || v_default_state,
    state_size_bytes = greatest(1, octet_length((public.workshop_snapshots.state || v_default_state)::text)),
    updated_at = now();

  update auth.users set
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || '{"founder_access":true,"plan":"business"}'::jsonb,
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'company_name', v_name,
        'selected_plan', 'business',
        'billing_interval', 'month',
        'founder_client', true
      )
  where id = p_user_id;

  perform private.ensure_workshop_portal(v_workshop_id, p_user_id);

  return jsonb_build_object(
    'user_id', p_user_id,
    'workshop_id', v_workshop_id,
    'license_id', v_license_id,
    'email', v_email,
    'workshop_name', v_name,
    'access', 'founder'
  );
end;
$$;

revoke all on function public.admin_provision_founder_client(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_provision_founder_client(uuid, text, text, text)
  to service_role;

comment on function public.admin_provision_founder_client(uuid, text, text, text) is
  'Provisionne un client historique avec acces fondateur, sans checkout ni abonnement Stripe. Appel service_role uniquement.';
