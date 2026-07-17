-- Rend le provisionnement Clerk relançable même si les réglages atelier existent déjà.
-- Utile après un double appel client ou une création automatique par trigger.

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
    insert into public.communication_settings(workshop_id)
    values (v_workshop_id)
    on conflict (workshop_id) do nothing;
    insert into public.document_settings(workshop_id)
    values (v_workshop_id)
    on conflict (workshop_id) do nothing;

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
