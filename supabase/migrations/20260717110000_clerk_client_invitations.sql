-- Invitations clients Clerk + provisionnement atomique de l'atelier et de la licence.
-- Clerk reste la source d'identite; Supabase reste la source de verite metier.

create table if not exists public.clerk_client_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  workshop_name text not null,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  license_id uuid not null references public.license_keys(id) on delete cascade,
  clerk_invitation_id text unique,
  clerk_user_id text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'failed', 'revoked')),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists clerk_client_invitations_active_email_key
  on public.clerk_client_invitations (lower(email))
  where status in ('pending', 'accepted');
create index if not exists clerk_client_invitations_clerk_user_idx
  on public.clerk_client_invitations (clerk_user_id)
  where clerk_user_id is not null;

alter table public.clerk_client_invitations enable row level security;
revoke all on public.clerk_client_invitations from public, anon, authenticated;

create or replace function public.admin_prepare_clerk_founder_client(
  p_provision_id uuid,
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
  v_workshop_id uuid;
  v_license_id uuid;
  v_existing public.clerk_client_invitations%rowtype;
  v_token text;
  v_state jsonb;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_provision_id is null then raise exception 'Provision invalide'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Adresse e-mail invalide';
  end if;
  if length(v_name) < 2 then raise exception 'Nom de l''atelier obligatoire'; end if;
  if length(v_key) < 12 then raise exception 'Cle de licence invalide'; end if;

  select * into v_existing
  from public.clerk_client_invitations
  where lower(email) = v_email and status in ('pending', 'accepted', 'failed')
  order by created_at desc limit 1 for update;

  if v_existing.status = 'accepted' then
    raise exception 'Ce client possede deja un acces Clerk actif';
  end if;

  v_workshop_id := coalesce(v_existing.workshop_id, gen_random_uuid());
  v_license_id := v_existing.license_id;
  v_hash := encode(extensions.digest(v_key, 'sha256'), 'hex');

  insert into public.workshops(id, name, commercial_name, email)
  values (v_workshop_id, v_name, v_name, v_email)
  on conflict (id) do update set
    name = excluded.name,
    commercial_name = excluded.commercial_name,
    email = excluded.email,
    updated_at = now();

  insert into public.subscriptions(
    workshop_id, plan, requested_plan, status, billing_interval, founder_access,
    current_period_start, current_period_end, cancel_at_period_end
  ) values (
    v_workshop_id, 'business', 'business', 'active', 'month', true,
    now(), null, false
  ) on conflict (workshop_id) do update set
    plan = 'business', requested_plan = 'business', status = 'active',
    billing_interval = 'month', founder_access = true,
    current_period_end = null, cancel_at_period_end = false, updated_at = now();

  if v_license_id is null then
    select id into v_license_id from public.license_keys where workshop_id = v_workshop_id limit 1;
  end if;

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
  else
    update public.license_keys set
      key_hash = v_hash,
      key_preview = left(v_key, 12) || '-****',
      status = 'active', assigned_customer_name = v_name,
      assigned_customer_email = v_email, plan = 'business',
      max_devices = 2147483647, workshop_id = v_workshop_id,
      activated_at = coalesce(activated_at, now()), expires_at = null,
      limits = '{"devices":null,"repairs_per_month":null,"sms_per_month":250}'::jsonb,
      founder_access = true, updated_at = now()
    where id = v_license_id;
  end if;

  insert into private.license_secrets(license_id, license_key)
  values (v_license_id, v_key)
  on conflict (license_id) do update set license_key = excluded.license_key;

  insert into public.communication_settings(workshop_id) values (v_workshop_id) on conflict do nothing;
  insert into public.document_settings(workshop_id) values (v_workshop_id) on conflict do nothing;

  v_state := jsonb_build_object(
    'licenseActivated', true, 'licenseKey', v_key,
    'licensePlan', 'Fondateur', 'licenseActivatedAt', now(),
    'onboardingCompleted', true
  );
  insert into public.workshop_snapshots(
    workshop_id, recovery_code, license_key, workshop_name, device_label,
    state, state_size_bytes, schema_version
  ) values (
    v_workshop_id, upper(encode(extensions.gen_random_bytes(12), 'hex')),
    v_key, v_name, 'Portail web', v_state,
    greatest(1, octet_length(v_state::text)), 1
  ) on conflict (workshop_id) do update set
    license_key = excluded.license_key,
    workshop_name = excluded.workshop_name,
    state = public.workshop_snapshots.state || v_state,
    state_size_bytes = greatest(1, octet_length((public.workshop_snapshots.state || v_state)::text)),
    updated_at = now();

  if v_existing.id is null then
    insert into public.clerk_client_invitations(
      id, email, workshop_name, workshop_id, license_id, status
    ) values (
      p_provision_id, v_email, v_name, v_workshop_id, v_license_id, 'pending'
    );
  else
    update public.clerk_client_invitations set
      email = v_email, workshop_name = v_name,
      workshop_id = v_workshop_id, license_id = v_license_id,
      clerk_invitation_id = null, clerk_user_id = null,
      status = 'pending', failure_reason = null,
      updated_at = now(), accepted_at = null
    where id = v_existing.id;
    p_provision_id := v_existing.id;
  end if;

  return jsonb_build_object(
    'provision_id', p_provision_id,
    'workshop_id', v_workshop_id,
    'license_id', v_license_id,
    'email', v_email,
    'workshop_name', v_name
  );
end;
$$;

revoke all on function public.admin_prepare_clerk_founder_client(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_prepare_clerk_founder_client(uuid, text, text, text)
  to service_role;

create or replace function public.admin_provision_clerk_user(
  p_clerk_user_id text,
  p_email text,
  p_first_name text default null,
  p_last_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clerk_id text := trim(coalesce(p_clerk_user_id, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_invitation public.clerk_client_invitations%rowtype;
  v_profile public.client_profiles%rowtype;
  v_workshop_id uuid;
  v_license_id uuid;
  v_key text;
  v_name text;
  v_hash text;
  v_token text;
  v_state jsonb;
  v_invited boolean := false;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if length(v_clerk_id) < 6 then raise exception 'Identifiant Clerk invalide'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Adresse e-mail invalide';
  end if;

  select * into v_profile from public.client_profiles
  where clerk_user_id = v_clerk_id limit 1;
  if v_profile.id is not null and v_profile.workshop_id is not null then
    return jsonb_build_object(
      'profile_id', v_profile.id, 'workshop_id', v_profile.workshop_id,
      'clerk_user_id', v_clerk_id, 'invited', v_profile.founder_access
    );
  end if;

  select * into v_invitation
  from public.clerk_client_invitations
  where lower(email) = v_email and status in ('pending', 'accepted')
  order by (status = 'pending') desc, created_at desc limit 1 for update;

  if v_invitation.status = 'accepted'
     and nullif(v_invitation.clerk_user_id, '') is distinct from v_clerk_id then
    raise exception 'Cette invitation a deja ete acceptee par un autre compte';
  end if;

  if v_invitation.id is not null then
    v_invited := true;
    v_workshop_id := v_invitation.workshop_id;
    v_license_id := v_invitation.license_id;
    v_name := v_invitation.workshop_name;
    select license_key into v_key from private.license_secrets where license_id = v_license_id;
  else
    v_workshop_id := gen_random_uuid();
    v_name := coalesce(nullif(trim(concat_ws(' ', p_first_name, p_last_name)), ''), split_part(v_email, '@', 1));
    v_key := 'BTP-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 4))
      || '-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 5, 4))
      || '-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 9, 4))
      || '-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 13, 4));
    v_hash := encode(extensions.digest(v_key, 'sha256'), 'hex');
    v_token := encode(extensions.gen_random_bytes(32), 'hex');

    insert into public.workshops(id, name, commercial_name, email)
    values (v_workshop_id, v_name, v_name, v_email);
    insert into public.subscriptions(workshop_id, plan, requested_plan, status, billing_interval)
    values (v_workshop_id, 'free', 'free', 'free', 'month');
    insert into public.license_keys(
      key_hash, key_preview, download_token_hash, status,
      assigned_customer_name, assigned_customer_email, plan, max_devices,
      workshop_id, activated_at, limits
    ) values (
      v_hash, left(v_key, 12) || '-****',
      encode(extensions.digest(v_token, 'sha256'), 'hex'), 'active',
      v_name, v_email, 'free', 1, v_workshop_id, now(),
      '{"devices":1,"repairs_per_month":10,"sms_per_month":10}'::jsonb
    ) returning id into v_license_id;
    insert into private.license_secrets(license_id, license_key) values (v_license_id, v_key);
    insert into public.communication_settings(workshop_id) values (v_workshop_id);
    insert into public.document_settings(workshop_id) values (v_workshop_id);

    v_state := jsonb_build_object(
      'licenseActivated', true, 'licenseKey', v_key,
      'licensePlan', 'Gratuit', 'licenseActivatedAt', now(),
      'onboardingCompleted', false
    );
    insert into public.workshop_snapshots(
      workshop_id, recovery_code, license_key, workshop_name, device_label,
      state, state_size_bytes, schema_version
    ) values (
      v_workshop_id, upper(encode(extensions.gen_random_bytes(12), 'hex')),
      v_key, v_name, 'Portail web', v_state,
      greatest(1, octet_length(v_state::text)), 1
    );
  end if;

  insert into public.organization_members(workshop_id, user_id, clerk_user_id, role, status)
  values (v_workshop_id, null, v_clerk_id, 'owner', 'active')
  on conflict (workshop_id, clerk_user_id) where clerk_user_id is not null
  do update set role = 'owner', status = 'active', updated_at = now();

  insert into public.client_profiles(
    user_id, clerk_user_id, workshop_id, email, first_name, last_name,
    company_name, onboarding_completed, plan, subscription_status,
    activation_key, repairs_limit, sms_limit, devices_limit,
    renewal_date, founder_access
  ) values (
    null, v_clerk_id, v_workshop_id, v_email,
    nullif(trim(coalesce(p_first_name, '')), ''),
    nullif(trim(coalesce(p_last_name, '')), ''),
    v_name, v_invited,
    case when v_invited then 'business' else 'free' end,
    'active', v_key,
    case when v_invited then null else 10 end,
    case when v_invited then 250 else 10 end,
    case when v_invited then null else 1 end,
    case when v_invited then null else now() + interval '1 month' end,
    v_invited
  ) on conflict (clerk_user_id) where clerk_user_id is not null
  do update set
    workshop_id = excluded.workshop_id, email = excluded.email,
    first_name = coalesce(excluded.first_name, public.client_profiles.first_name),
    last_name = coalesce(excluded.last_name, public.client_profiles.last_name),
    company_name = excluded.company_name,
    onboarding_completed = excluded.onboarding_completed,
    plan = excluded.plan, subscription_status = excluded.subscription_status,
    activation_key = excluded.activation_key,
    repairs_limit = excluded.repairs_limit, sms_limit = excluded.sms_limit,
    devices_limit = excluded.devices_limit, renewal_date = excluded.renewal_date,
    founder_access = excluded.founder_access, updated_at = now()
  returning * into v_profile;

  if v_invitation.id is not null then
    update public.clerk_client_invitations set
      clerk_user_id = v_clerk_id, status = 'accepted',
      accepted_at = coalesce(accepted_at, now()), updated_at = now(),
      failure_reason = null
    where id = v_invitation.id;
  end if;

  return jsonb_build_object(
    'profile_id', v_profile.id, 'workshop_id', v_workshop_id,
    'license_id', v_license_id, 'clerk_user_id', v_clerk_id,
    'invited', v_invited
  );
end;
$$;

revoke all on function public.admin_provision_clerk_user(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_provision_clerk_user(text, text, text, text)
  to service_role;

