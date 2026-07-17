-- Behar Tech Pro - source de verite commune site public + SaaS.
-- `workshops` est conserve comme organisation canonique afin de ne pas
-- dupliquer les ateliers et toutes les tables metier deja rattachees par
-- workshop_id.

create extension if not exists pgcrypto;
create schema if not exists private;
grant usage on schema private to authenticated;

alter table public.workshops
  add column if not exists website text,
  add column if not exists country text not null default 'FR',
  add column if not exists currency text not null default 'EUR',
  add column if not exists legal_mentions text,
  add column if not exists warranty_terms text,
  add column if not exists business_hours text;

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'technician', 'member')),
  status text not null default 'active'
    check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, user_id)
);

create index if not exists organization_members_user_idx
  on public.organization_members(user_id, status);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null unique references public.workshops(id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'starter', 'pro', 'business')),
  status text not null default 'active'
    check (status in ('free', 'trialing', 'pending', 'active', 'past_due', 'unpaid', 'paused', 'canceled', 'refunded')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_events (
  stripe_event_id text primary key,
  workshop_id uuid references public.workshops(id) on delete set null,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.license_keys
  add column if not exists workshop_id uuid references public.workshops(id) on delete cascade,
  add column if not exists activated_at timestamptz,
  add column if not exists stripe_subscription_id text,
  add column if not exists limits jsonb not null default '{}'::jsonb;

create unique index if not exists license_keys_workshop_unique
  on public.license_keys(workshop_id)
  where workshop_id is not null;

alter table public.license_keys drop constraint if exists license_keys_status_check;
alter table public.license_keys
  add constraint license_keys_status_check
  check (status in ('pending', 'active', 'inactive', 'used', 'past_due', 'expired', 'canceled', 'refunded'));

create table if not exists private.license_secrets (
  license_id uuid primary key references public.license_keys(id) on delete cascade,
  license_key text not null unique,
  created_at timestamptz not null default now()
);
revoke all on private.license_secrets from public, anon, authenticated;

create table if not exists public.communication_settings (
  workshop_id uuid primary key references public.workshops(id) on delete cascade,
  sms_templates jsonb not null default '{}'::jsonb,
  email_templates jsonb not null default '{}'::jsonb,
  sender_name text,
  reply_to text,
  email_signature text,
  brand_color text not null default '#2A9D8F',
  automations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_settings (
  workshop_id uuid primary key references public.workshops(id) on delete cascade,
  logo_url text,
  primary_color text not null default '#2A9D8F',
  legal_mentions text,
  terms text,
  footer text,
  warranty text,
  signature_url text,
  show_tracking_qr boolean not null default true,
  numbering jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  period_start date not null,
  repairs_count integer not null default 0 check (repairs_count >= 0),
  sms_count integer not null default 0 check (sms_count >= 0),
  email_count integer not null default 0 check (email_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (workshop_id, period_start)
);

-- Compatibilite avec le portail Svelte existant. La ligne profil pointe
-- desormais vers le meme atelier au lieu de porter une deuxieme identite metier.
create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  workshop_id uuid references public.workshops(id) on delete set null,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  postal_code text,
  company_name text,
  company_city text,
  company_country text default 'France',
  company_phone text,
  company_website text,
  team_size text,
  acquisition_source text,
  onboarding_completed boolean not null default false,
  plan text not null default 'free',
  subscription_status text not null default 'active',
  activation_key text,
  repairs_limit integer not null default 10,
  repairs_used integer not null default 0,
  sms_limit integer not null default 10,
  sms_used integer not null default 0,
  devices_limit integer not null default 1,
  devices_used integer not null default 0,
  renewal_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_profiles add column if not exists workshop_id uuid references public.workshops(id) on delete set null;

create or replace function private.member_of(p_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.workshop_id = p_workshop_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;
revoke all on function private.member_of(uuid) from public, anon, authenticated;
grant execute on function private.member_of(uuid) to authenticated;

create or replace function private.can_manage(p_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.workshop_id = p_workshop_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  );
$$;
revoke all on function private.can_manage(uuid) from public, anon, authenticated;
grant execute on function private.can_manage(uuid) to authenticated;

-- Provisionnement uniquement une fois l'adresse confirmee. Google fournit un
-- email_confirmed_at des la creation, le parcours e-mail passe par le trigger
-- UPDATE lors de la verification.
create or replace function private.provision_confirmed_user(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user auth.users%rowtype;
  v_workshop_id uuid;
  v_license_id uuid;
  v_key text;
  v_hash text;
begin
  select * into v_user from auth.users where id = p_user_id;
  if v_user.id is null or coalesce(v_user.email_confirmed_at, v_user.confirmed_at) is null then
    return null;
  end if;

  select workshop_id into v_workshop_id
  from public.organization_members
  where user_id = p_user_id and status = 'active'
  order by created_at
  limit 1;

  if v_workshop_id is null then
    insert into public.workshops(name, commercial_name, email)
    values (
      coalesce(nullif(v_user.raw_user_meta_data ->> 'company_name', ''), split_part(coalesce(v_user.email, 'Mon atelier'), '@', 1)),
      nullif(v_user.raw_user_meta_data ->> 'company_name', ''),
      coalesce(v_user.email, '')
    ) returning id into v_workshop_id;

    insert into public.organization_members(workshop_id, user_id, role, status)
    values (v_workshop_id, p_user_id, 'owner', 'active');
  end if;

  insert into public.subscriptions(workshop_id, plan, status)
  values (v_workshop_id, 'free', 'free')
  on conflict (workshop_id) do nothing;

  select id into v_license_id from public.license_keys where workshop_id = v_workshop_id;
  if v_license_id is null then
    select activation_key into v_key from public.client_profiles where user_id = p_user_id;
    if v_key is null or length(trim(v_key)) < 12 then
      v_key := 'BTP-' || upper(encode(extensions.gen_random_bytes(6), 'hex')) || '-' || upper(encode(extensions.gen_random_bytes(6), 'hex'));
    end if;
    v_key := upper(trim(v_key));
    v_hash := encode(extensions.digest(upper(trim(v_key)), 'sha256'), 'hex');
    insert into public.license_keys(
      key_hash, key_preview, download_token_hash, status, assigned_customer_email,
      plan, max_devices, workshop_id, activated_at, limits
    ) values (
      v_hash,
      left(v_key, 12) || '-****',
      encode(extensions.digest(encode(extensions.gen_random_bytes(32), 'hex'), 'sha256'), 'hex'),
      'active',
      v_user.email,
      'free',
      1,
      v_workshop_id,
      now(),
      '{"devices":1,"repairs_per_month":10,"sms_per_month":10}'::jsonb
    ) returning id into v_license_id;
    insert into private.license_secrets(license_id, license_key) values (v_license_id, v_key);
  else
    select license_key into v_key from private.license_secrets where license_id = v_license_id;
  end if;

  insert into public.communication_settings(workshop_id) values (v_workshop_id) on conflict do nothing;
  insert into public.document_settings(workshop_id) values (v_workshop_id) on conflict do nothing;

  insert into public.client_profiles(
    user_id, workshop_id, email, first_name, last_name, company_name,
    plan, subscription_status, activation_key, repairs_limit, sms_limit, devices_limit,
    renewal_date
  ) values (
    p_user_id, v_workshop_id, coalesce(v_user.email, ''),
    nullif(v_user.raw_user_meta_data ->> 'first_name', ''),
    nullif(v_user.raw_user_meta_data ->> 'last_name', ''),
    nullif(v_user.raw_user_meta_data ->> 'company_name', ''),
    'free', 'active', v_key, 10, 10, 1, now() + interval '1 month'
  ) on conflict (user_id) do update set
    workshop_id = excluded.workshop_id,
    activation_key = excluded.activation_key,
    updated_at = now();

  insert into public.workshop_snapshots(
    workshop_id, recovery_code, license_key, workshop_name, device_label,
    state, state_size_bytes, schema_version
  ) values (
    v_workshop_id,
    upper(encode(extensions.gen_random_bytes(12), 'hex')),
    v_key,
    coalesce(nullif(v_user.raw_user_meta_data ->> 'company_name', ''), split_part(coalesce(v_user.email, 'Mon atelier'), '@', 1)),
    'Portail web',
    jsonb_build_object(
      'licenseActivated', true,
      'licenseKey', v_key,
      'licensePlan', 'Gratuit',
      'licenseActivatedAt', now(),
      'onboardingCompleted', false
    ),
    256,
    1
  ) on conflict (workshop_id) do nothing;

  return v_workshop_id;
end;
$$;
revoke all on function private.provision_confirmed_user(uuid) from public, anon, authenticated;

create or replace function private.handle_confirmed_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.email_confirmed_at, new.confirmed_at) is not null then
    perform private.provision_confirmed_user(new.id);
  end if;
  return new;
end;
$$;
revoke all on function private.handle_confirmed_user() from public, anon, authenticated;

drop trigger if exists provision_confirmed_behar_user on auth.users;
drop trigger if exists on_auth_user_created_client_profile on auth.users;
create trigger provision_confirmed_behar_user
after insert or update of email_confirmed_at on auth.users
for each row execute function private.handle_confirmed_user();

-- Rattrapage non destructif des comptes deja verifies.
do $$
declare u record;
begin
  for u in select id from auth.users where coalesce(email_confirmed_at, confirmed_at) is not null loop
    perform private.provision_confirmed_user(u.id);
  end loop;
end;
$$;

create or replace function private.sync_client_profile_to_workshop()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings jsonb;
begin
  if new.workshop_id is null then return new; end if;
  update public.workshops set
    name = coalesce(nullif(new.company_name, ''), name),
    commercial_name = coalesce(nullif(new.company_name, ''), commercial_name),
    phone = coalesce(nullif(new.company_phone, ''), phone),
    email = coalesce(nullif(new.email, ''), email),
    postal_code = coalesce(nullif(new.postal_code, ''), postal_code),
    city = coalesce(nullif(new.company_city, ''), city),
    website = coalesce(nullif(new.company_website, ''), website),
    country = case when lower(coalesce(new.company_country, '')) like 'suisse%' then 'CH' else 'FR' end,
    currency = case when lower(coalesce(new.company_country, '')) like 'suisse%' then 'CHF' else 'EUR' end,
    updated_at = now()
  where id = new.workshop_id;

  v_settings := jsonb_build_object(
    'name', coalesce(nullif(new.company_name, ''), split_part(new.email, '@', 1)),
    'commercialName', new.company_name,
    'phone', new.company_phone,
    'email', new.email,
    'website', new.company_website,
    'postalCity', concat_ws(' ', new.postal_code, new.company_city),
    'country', case when lower(coalesce(new.company_country, '')) like 'suisse%' then 'CH' else 'FR' end,
    'currency', case when lower(coalesce(new.company_country, '')) like 'suisse%' then 'CHF' else 'EUR' end
  );
  update public.workshop_snapshots set
    workshop_name = coalesce(nullif(new.company_name, ''), workshop_name),
    state = state || jsonb_build_object(
      'onboardingCompleted', new.onboarding_completed,
      'workshopSettings', coalesce(state -> 'workshopSettings', '{}'::jsonb) || v_settings,
      'workshopInfo', coalesce(state -> 'workshopInfo', '{}'::jsonb) || v_settings
    ),
    state_size_bytes = greatest(1, octet_length((state || jsonb_build_object(
      'onboardingCompleted', new.onboarding_completed,
      'workshopSettings', coalesce(state -> 'workshopSettings', '{}'::jsonb) || v_settings,
      'workshopInfo', coalesce(state -> 'workshopInfo', '{}'::jsonb) || v_settings
    ))::text))
  where workshop_id = new.workshop_id;
  return new;
end;
$$;
revoke all on function private.sync_client_profile_to_workshop() from public, anon, authenticated;

drop trigger if exists client_profile_sync_workshop on public.client_profiles;
create trigger client_profile_sync_workshop
after insert or update of company_name, company_city, company_country, company_phone,
  company_website, postal_code, onboarding_completed
on public.client_profiles
for each row execute function private.sync_client_profile_to_workshop();

do $$
declare t text;
begin
  foreach t in array array[
    'organization_members', 'subscriptions', 'subscription_events',
    'communication_settings', 'document_settings', 'usage_counters', 'client_profiles'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

drop policy if exists organizations_read on public.workshops;
create policy organizations_read on public.workshops for select to authenticated
using (private.member_of(id));
drop policy if exists organizations_manage on public.workshops;
create policy organizations_manage on public.workshops for update to authenticated
using (private.can_manage(id)) with check (private.can_manage(id));

drop policy if exists organization_members_read on public.organization_members;
create policy organization_members_read on public.organization_members for select to authenticated
using (private.member_of(workshop_id));
drop policy if exists organization_members_manage on public.organization_members;
create policy organization_members_manage on public.organization_members for all to authenticated
using (private.can_manage(workshop_id)) with check (private.can_manage(workshop_id));

drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions for select to authenticated
using (private.member_of(workshop_id));

drop policy if exists license_keys_read on public.license_keys;
create policy license_keys_read on public.license_keys for select to authenticated
using (workshop_id is not null and private.member_of(workshop_id));

drop policy if exists communication_settings_read on public.communication_settings;
create policy communication_settings_read on public.communication_settings for select to authenticated
using (private.member_of(workshop_id));
drop policy if exists communication_settings_manage on public.communication_settings;
create policy communication_settings_manage on public.communication_settings for all to authenticated
using (private.can_manage(workshop_id)) with check (private.can_manage(workshop_id));

drop policy if exists document_settings_read on public.document_settings;
create policy document_settings_read on public.document_settings for select to authenticated
using (private.member_of(workshop_id));
drop policy if exists document_settings_manage on public.document_settings;
create policy document_settings_manage on public.document_settings for all to authenticated
using (private.can_manage(workshop_id)) with check (private.can_manage(workshop_id));

drop policy if exists usage_counters_read on public.usage_counters;
create policy usage_counters_read on public.usage_counters for select to authenticated
using (private.member_of(workshop_id));

drop policy if exists client_profiles_read_own on public.client_profiles;
create policy client_profiles_read_own on public.client_profiles for select to authenticated
using (user_id = (select auth.uid()));
drop policy if exists client_profiles_update_own on public.client_profiles;
create policy client_profiles_update_own on public.client_profiles for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Tables metier : isolation de lecture/ecriture par atelier pour les clients
-- Supabase authentifies. Le service_role des routes SaaS conserve son bypass.
do $$
declare t text;
begin
  foreach t in array array[
    'team_members', 'clients', 'repairs', 'repair_events', 'repair_messages',
    'quotes', 'invoices', 'payments', 'sales', 'documents', 'stock_items',
    'app_settings', 'appointments'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists tenant_member_access on public.%I', t);
      execute format(
        'create policy tenant_member_access on public.%I for select to authenticated using (private.member_of(workshop_id))',
        t
      );
      execute format('grant select on public.%I to authenticated', t);
    end if;
  end loop;
end;
$$;

grant select, update on public.workshops to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select on public.subscriptions, public.usage_counters to authenticated;
revoke all on public.license_keys from authenticated;
grant select (id, workshop_id, status, plan, max_devices, used_devices, activated_at, expires_at, limits)
  on public.license_keys to authenticated;
grant select, insert, update, delete on public.communication_settings, public.document_settings to authenticated;
revoke insert, update on public.client_profiles from authenticated;
grant select on public.client_profiles to authenticated;
grant update (
  first_name, last_name, phone, postal_code, company_name, company_city,
  company_country, company_phone, company_website, team_size,
  acquisition_source, onboarding_completed, updated_at
) on public.client_profiles to authenticated;

-- Handoff SSO v2 : le navigateur ne recoit qu'un nonce dans l'URL. Le SaaS
-- l'echange cote serveur, pose son cookie HttpOnly puis hydrate la licence.
alter table public.workshop_session_handoffs
  add column if not exists workshop_id uuid references public.workshops(id) on delete cascade,
  add column if not exists license_id uuid references public.license_keys(id) on delete cascade;

create or replace function public.create_workshop_handoff()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_user_id uuid := (select auth.uid());
  v_workshop_id uuid;
  v_license_id uuid;
  v_license_key text;
begin
  if v_user_id is null then return null; end if;

  select m.workshop_id into v_workshop_id
  from public.organization_members m
  where m.user_id = v_user_id and m.status = 'active'
  order by (m.role = 'owner') desc, m.created_at
  limit 1;
  if v_workshop_id is null then return null; end if;

  select l.id, s.license_key into v_license_id, v_license_key
  from public.license_keys l
  join private.license_secrets s on s.license_id = l.id
  where l.workshop_id = v_workshop_id
    and l.status in ('active', 'used', 'past_due')
  limit 1;
  if v_license_id is null then return null; end if;

  delete from public.workshop_session_handoffs
  where expires_at <= now() or redeemed_at is not null;

  v_code := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.workshop_session_handoffs(code, user_id, license_key, workshop_id, license_id)
  values (v_code, v_user_id, v_license_key, v_workshop_id, v_license_id);
  return v_code;
end;
$$;
revoke all on function public.create_workshop_handoff() from public, anon, authenticated;
grant execute on function public.create_workshop_handoff() to authenticated;

revoke all on function public.redeem_workshop_handoff(text) from public, anon, authenticated;

create or replace function public.redeem_workshop_handoff_v2(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_handoff public.workshop_session_handoffs%rowtype;
  v_plan text;
  v_status text;
begin
  update public.workshop_session_handoffs
  set redeemed_at = now()
  where code = p_code
    and redeemed_at is null
    and expires_at > now()
  returning * into v_handoff;
  if v_handoff.code is null then return null; end if;

  select plan, status into v_plan, v_status
  from public.license_keys where id = v_handoff.license_id;

  return jsonb_build_object(
    'user_id', v_handoff.user_id,
    'workshop_id', v_handoff.workshop_id,
    'license_id', v_handoff.license_id,
    'license_key', v_handoff.license_key,
    'plan', v_plan,
    'status', v_status
  );
end;
$$;
revoke all on function public.redeem_workshop_handoff_v2(text) from public, anon, authenticated;
grant execute on function public.redeem_workshop_handoff_v2(text) to service_role;

do $$
declare t text;
begin
  foreach t in array array['shops', 'widget_settings', 'widget_leads'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists tenant_member_read on public.%I', t);
      execute format(
        'create policy tenant_member_read on public.%I for select to authenticated using (private.member_of(tenant_id))',
        t
      );
      execute format('grant select on public.%I to authenticated', t);
    end if;
  end loop;
end;
$$;
