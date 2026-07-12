-- Behar Tech Pro — client account creation, onboarding and team invitations.
-- Run this file in Supabase SQL editor if the MCP database connection is not configured.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
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
  onboarding_completed boolean default false,
  plan text default 'free',
  subscription_status text default 'active',
  activation_key text unique,
  repairs_limit integer default 10,
  repairs_used integer default 0,
  sms_limit integer default 10,
  sms_used integer default 0,
  devices_limit integer default 1,
  devices_used integer default 0,
  renewal_date timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.generate_client_activation_key()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  group_value text;
  group_index integer;
  char_index integer;
begin
  loop
    candidate := 'BTP';

    for group_index in 1..3 loop
      group_value := '';
      for char_index in 1..4 loop
        group_value := group_value || substr(alphabet, floor(random() * length(alphabet) + 1)::integer, 1);
      end loop;
      candidate := candidate || '-' || group_value;
    end loop;

    exit when not exists (
      select 1
      from public.client_profiles
      where activation_key = candidate
    );
  end loop;

  return candidate;
end;
$$;

alter table public.client_profiles
  alter column activation_key set default public.generate_client_activation_key();

update public.client_profiles
set activation_key = public.generate_client_activation_key()
where activation_key is null;

alter table public.client_profiles
  alter column activation_key set not null;

create index if not exists client_profiles_user_id_idx on public.client_profiles(user_id);
create index if not exists client_profiles_activation_key_idx on public.client_profiles(activation_key);

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('Admin', 'Atelier', 'Comptoir', 'Lecture seule')),
  status text default 'pending',
  created_at timestamptz default now()
);

create index if not exists team_invitations_owner_user_id_idx on public.team_invitations(owner_user_id);

alter table public.client_profiles enable row level security;
alter table public.team_invitations enable row level security;

drop policy if exists "Users can read own client profile" on public.client_profiles;
create policy "Users can read own client profile"
on public.client_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own client profile" on public.client_profiles;
create policy "Users can create own client profile"
on public.client_profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own client profile" on public.client_profiles;
create policy "Users can update own client profile"
on public.client_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "App admins can read client profiles" on public.client_profiles;
create policy "App admins can read client profiles"
on public.client_profiles for select
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false));

drop policy if exists "Users can read own team invitations" on public.team_invitations;
create policy "Users can read own team invitations"
on public.team_invitations for select
to authenticated
using ((select auth.uid()) = owner_user_id);

drop policy if exists "Users can create own team invitations" on public.team_invitations;
create policy "Users can create own team invitations"
on public.team_invitations for insert
to authenticated
with check ((select auth.uid()) = owner_user_id);

drop policy if exists "App admins can read team invitations" on public.team_invitations;
create policy "App admins can read team invitations"
on public.team_invitations for select
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false));

grant select, insert, update on public.client_profiles to authenticated;
grant select, insert on public.team_invitations to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_profiles_set_updated_at on public.client_profiles;
create trigger client_profiles_set_updated_at
before update on public.client_profiles
for each row
execute function public.set_updated_at();

create or replace function private.handle_new_client_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.client_profiles (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_client_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_client_profile on auth.users;
create trigger on_auth_user_created_client_profile
after insert on auth.users
for each row
execute function private.handle_new_client_user();
