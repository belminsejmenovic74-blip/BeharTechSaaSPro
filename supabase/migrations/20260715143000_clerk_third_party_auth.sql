-- Use Clerk as the identity provider while keeping existing Supabase Auth rows valid.

alter table public.client_profiles
  add column if not exists clerk_user_id text,
  alter column user_id drop not null;

alter table public.organization_members
  add column if not exists clerk_user_id text,
  alter column user_id drop not null;

alter table public.team_invitations
  add column if not exists owner_clerk_user_id text,
  alter column owner_user_id drop not null;

alter table public.workshop_session_handoffs
  add column if not exists clerk_user_id text,
  alter column user_id drop not null;

alter table public.client_profiles
  drop constraint if exists client_profiles_identity_check,
  add constraint client_profiles_identity_check
    check (user_id is not null or nullif(clerk_user_id, '') is not null);

alter table public.organization_members
  drop constraint if exists organization_members_identity_check,
  add constraint organization_members_identity_check
    check (user_id is not null or nullif(clerk_user_id, '') is not null);

alter table public.team_invitations
  drop constraint if exists team_invitations_owner_identity_check,
  add constraint team_invitations_owner_identity_check
    check (owner_user_id is not null or nullif(owner_clerk_user_id, '') is not null);

alter table public.workshop_session_handoffs
  drop constraint if exists workshop_session_handoffs_identity_check,
  add constraint workshop_session_handoffs_identity_check
    check (user_id is not null or nullif(clerk_user_id, '') is not null);

create unique index if not exists client_profiles_clerk_user_id_key
  on public.client_profiles (clerk_user_id)
  where clerk_user_id is not null;

create unique index if not exists organization_members_workshop_clerk_user_key
  on public.organization_members (workshop_id, clerk_user_id)
  where clerk_user_id is not null;

create index if not exists team_invitations_owner_clerk_user_idx
  on public.team_invitations (owner_clerk_user_id)
  where owner_clerk_user_id is not null;

create index if not exists workshop_session_handoffs_clerk_user_idx
  on public.workshop_session_handoffs (clerk_user_id)
  where clerk_user_id is not null;

drop policy if exists "Users can create own client profile" on public.client_profiles;
drop policy if exists "Users can read own client profile" on public.client_profiles;
drop policy if exists "Users can update own client profile" on public.client_profiles;
drop policy if exists client_profiles_read_own on public.client_profiles;
drop policy if exists client_profiles_update_own on public.client_profiles;

create policy client_profiles_insert_own
  on public.client_profiles for insert to authenticated
  with check (
    (select auth.jwt()->>'sub') = coalesce(clerk_user_id, user_id::text)
  );

create policy client_profiles_read_own
  on public.client_profiles for select to authenticated
  using (
    (select auth.jwt()->>'sub') = coalesce(clerk_user_id, user_id::text)
  );

create policy client_profiles_update_own
  on public.client_profiles for update to authenticated
  using (
    (select auth.jwt()->>'sub') = coalesce(clerk_user_id, user_id::text)
  )
  with check (
    (select auth.jwt()->>'sub') = coalesce(clerk_user_id, user_id::text)
  );

drop policy if exists "Users can create own team invitations" on public.team_invitations;
drop policy if exists "Users can read own team invitations" on public.team_invitations;

create policy team_invitations_insert_own
  on public.team_invitations for insert to authenticated
  with check (
    (select auth.jwt()->>'sub') = coalesce(owner_clerk_user_id, owner_user_id::text)
  );

create policy team_invitations_read_own
  on public.team_invitations for select to authenticated
  using (
    (select auth.jwt()->>'sub') = coalesce(owner_clerk_user_id, owner_user_id::text)
  );

create or replace function private.member_of(p_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.workshop_id = p_workshop_id
      and coalesce(m.clerk_user_id, m.user_id::text) = (select auth.jwt()->>'sub')
      and m.status = 'active'
  );
$$;

create or replace function private.can_manage(p_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.workshop_id = p_workshop_id
      and coalesce(m.clerk_user_id, m.user_id::text) = (select auth.jwt()->>'sub')
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.create_workshop_handoff()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_subject text := (select auth.jwt()->>'sub');
  v_legacy_user_id uuid;
  v_workshop_id uuid;
  v_license_id uuid;
  v_license_key text;
begin
  if nullif(v_subject, '') is null then return null; end if;

  if v_subject ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_legacy_user_id := v_subject::uuid;
  end if;

  select m.workshop_id into v_workshop_id
  from public.organization_members m
  where coalesce(m.clerk_user_id, m.user_id::text) = v_subject
    and m.status = 'active'
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
  insert into public.workshop_session_handoffs(
    code, user_id, clerk_user_id, license_key, workshop_id, license_id
  ) values (
    v_code,
    v_legacy_user_id,
    case when v_legacy_user_id is null then v_subject else null end,
    v_license_key,
    v_workshop_id,
    v_license_id
  );
  return v_code;
end;
$$;

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
    'clerk_user_id', v_handoff.clerk_user_id,
    'workshop_id', v_handoff.workshop_id,
    'license_id', v_handoff.license_id,
    'license_key', v_handoff.license_key,
    'plan', v_plan,
    'status', v_status
  );
end;
$$;
