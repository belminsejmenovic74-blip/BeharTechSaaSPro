-- Behar Tech Pro — Visual CMS backed by Supabase.
-- Creates the real CMS tables, admin RPC session flow, draft/publish versions,
-- public read of published content, and the cms-assets Storage bucket.

create extension if not exists pgcrypto;

create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  seo_title text,
  seo_description text,
  og_image text,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.cms_pages(id) on delete cascade,
  type text not null,
  sort_order integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_elements (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.cms_sections(id) on delete cascade,
  parent_id uuid references public.cms_elements(id) on delete cascade,
  type text not null,
  name text,
  content jsonb not null default '{}'::jsonb,
  styles jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_assets (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  path text unique not null,
  alt text,
  type text,
  size integer,
  created_at timestamptz not null default now()
);

create table if not exists public.cms_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.cms_pages(id) on delete cascade,
  snapshot jsonb not null,
  version_type text not null default 'draft' check (version_type in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create table if not exists public.cms_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_admin_config (
  id boolean primary key default true check (id),
  password_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_admin_sessions (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

insert into public.cms_admin_config (id, password_hash)
values (true, crypt('behar-admin', gen_salt('bf')))
on conflict (id) do nothing;

create index if not exists cms_sections_page_order_idx on public.cms_sections(page_id, sort_order);
create index if not exists cms_sections_type_idx on public.cms_sections(type);
create index if not exists cms_elements_section_order_idx on public.cms_elements(section_id, sort_order);
create index if not exists cms_assets_path_idx on public.cms_assets(path);
create index if not exists cms_versions_page_type_created_idx on public.cms_versions(page_id, version_type, created_at desc);
create index if not exists cms_admin_sessions_expires_idx on public.cms_admin_sessions(expires_at);

create or replace function public.cms_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cms_pages_set_updated_at on public.cms_pages;
create trigger cms_pages_set_updated_at
before update on public.cms_pages
for each row execute function public.cms_set_updated_at();

drop trigger if exists cms_sections_set_updated_at on public.cms_sections;
create trigger cms_sections_set_updated_at
before update on public.cms_sections
for each row execute function public.cms_set_updated_at();

drop trigger if exists cms_elements_set_updated_at on public.cms_elements;
create trigger cms_elements_set_updated_at
before update on public.cms_elements
for each row execute function public.cms_set_updated_at();

drop trigger if exists cms_settings_set_updated_at on public.cms_settings;
create trigger cms_settings_set_updated_at
before update on public.cms_settings
for each row execute function public.cms_set_updated_at();

drop trigger if exists cms_admin_config_set_updated_at on public.cms_admin_config;
create trigger cms_admin_config_set_updated_at
before update on public.cms_admin_config
for each row execute function public.cms_set_updated_at();

create or replace function public.cms_token_hash(session_token text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select encode(digest(coalesce(session_token, ''), 'sha256'), 'hex')
$$;

create or replace function public.cms_is_valid_admin_session(session_token text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.cms_admin_sessions
    where token_hash = public.cms_token_hash(session_token)
      and expires_at > now()
  )
$$;

create or replace function public.cms_is_valid_admin_session_hash(session_token_hash text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.cms_admin_sessions
    where token_hash = coalesce(session_token_hash, '')
      and expires_at > now()
  )
$$;

create or replace function public.cms_require_admin_session(session_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.cms_admin_sessions where expires_at <= now();

  if not public.cms_is_valid_admin_session(session_token) then
    raise exception 'cms_admin_session_invalid' using errcode = '28000';
  end if;
end;
$$;

create or replace function public.cms_admin_login(passcode text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  session_token text;
begin
  delete from public.cms_admin_sessions where expires_at <= now();

  if not exists (
    select 1
    from public.cms_admin_config
    where id = true
      and password_hash = crypt(coalesce(passcode, ''), password_hash)
  ) then
    raise exception 'cms_admin_password_invalid' using errcode = '28000';
  end if;

  session_token := gen_random_uuid()::text || replace(gen_random_uuid()::text, '-', '');

  insert into public.cms_admin_sessions (token_hash, expires_at)
  values (public.cms_token_hash(session_token), now() + interval '12 hours');

  return session_token;
end;
$$;

create or replace function public.cms_admin_logout(session_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.cms_admin_sessions
  where token_hash = public.cms_token_hash(session_token);
end;
$$;

create or replace function public.cms_snapshot_from_tables()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'pages',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'slug', p.slug,
            'title', p.title,
            'seo_title', p.seo_title,
            'seo_description', p.seo_description,
            'status', p.status,
            'created_at', p.created_at,
            'updated_at', p.updated_at
          )
          order by p.slug
        )
        from public.cms_pages p
      ),
      '[]'::jsonb
    ),
    'page_sections',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'page_id', s.page_id,
            'type', s.type,
            'order', s.sort_order,
            'content', s.content,
            'settings', s.settings,
            'created_at', s.created_at,
            'updated_at', s.updated_at
          )
          order by s.sort_order
        )
        from public.cms_sections s
      ),
      '[]'::jsonb
    ),
    'theme',
    coalesce((select value from public.cms_settings where key = 'theme'), '{}'::jsonb)
  )
$$;

create or replace function public.cms_get_draft(session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_snapshot jsonb;
begin
  perform public.cms_require_admin_session(session_token);

  select snapshot
  into draft_snapshot
  from public.cms_versions
  where version_type = 'draft'
  order by created_at desc
  limit 1;

  return coalesce(draft_snapshot, public.cms_snapshot_from_tables());
end;
$$;

create or replace function public.cms_get_published(page_slug text default '/')
returns jsonb
language sql
stable
set search_path = public
as $$
  select snapshot
  from public.cms_versions
  where version_type = 'published'
    and (
      page_slug is null
      or exists (
        select 1
        from jsonb_array_elements(snapshot -> 'pages') as page_item
        where page_item ->> 'slug' = page_slug
      )
    )
  order by created_at desc
  limit 1
$$;

create or replace function public.cms_save_draft(session_token text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  page_item jsonb;
  section_item jsonb;
  first_page_id uuid;
begin
  perform public.cms_require_admin_session(session_token);

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'cms_payload_invalid';
  end if;

  if jsonb_typeof(payload -> 'pages') <> 'array' then
    raise exception 'cms_pages_payload_invalid';
  end if;

  for page_item in select value from jsonb_array_elements(payload -> 'pages') loop
    insert into public.cms_pages (
      id,
      slug,
      title,
      seo_title,
      seo_description,
      status,
      updated_at
    )
    values (
      (page_item ->> 'id')::uuid,
      coalesce(nullif(page_item ->> 'slug', ''), '/'),
      coalesce(nullif(page_item ->> 'title', ''), 'Accueil'),
      page_item ->> 'seo_title',
      page_item ->> 'seo_description',
      'draft',
      now()
    )
    on conflict (id) do update
      set slug = excluded.slug,
          title = excluded.title,
          seo_title = excluded.seo_title,
          seo_description = excluded.seo_description,
          status = 'draft',
          updated_at = now();
  end loop;

  select (value ->> 'id')::uuid
  into first_page_id
  from jsonb_array_elements(payload -> 'pages')
  limit 1;

  delete from public.cms_sections
  where page_id in (
    select (value ->> 'id')::uuid
    from jsonb_array_elements(payload -> 'pages')
  );

  if jsonb_typeof(payload -> 'page_sections') = 'array' then
    for section_item in select value from jsonb_array_elements(payload -> 'page_sections') loop
      insert into public.cms_sections (
        id,
        page_id,
        type,
        sort_order,
        content,
        settings,
        updated_at
      )
      values (
        (section_item ->> 'id')::uuid,
        (section_item ->> 'page_id')::uuid,
        coalesce(nullif(section_item ->> 'type', ''), 'hero'),
        coalesce((section_item ->> 'order')::integer, 0),
        coalesce(section_item -> 'content', '{}'::jsonb),
        coalesce(section_item -> 'settings', '{}'::jsonb),
        now()
      );
    end loop;
  end if;

  insert into public.cms_settings (key, value)
  values ('theme', coalesce(payload -> 'theme', '{}'::jsonb))
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now();

  insert into public.cms_versions (page_id, snapshot, version_type)
  values (first_page_id, payload, 'draft');
end;
$$;

create or replace function public.cms_publish(session_token text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  first_page_id uuid;
begin
  perform public.cms_save_draft(session_token, payload);

  update public.cms_pages
  set status = 'published',
      published_at = now(),
      updated_at = now()
  where id in (
    select (value ->> 'id')::uuid
    from jsonb_array_elements(payload -> 'pages')
  );

  select (value ->> 'id')::uuid
  into first_page_id
  from jsonb_array_elements(payload -> 'pages')
  limit 1;

  insert into public.cms_versions (page_id, snapshot, version_type)
  values (first_page_id, payload, 'published');
end;
$$;

create or replace function public.cms_reset_draft(session_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cms_require_admin_session(session_token);
  delete from public.cms_sections;
  delete from public.cms_pages;
  delete from public.cms_settings where key = 'theme';
  delete from public.cms_versions where version_type = 'draft';
end;
$$;

create or replace function public.cms_record_asset(
  session_token text,
  asset_url text,
  asset_path text,
  asset_alt text,
  asset_type text,
  asset_size integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  asset_id uuid;
begin
  perform public.cms_require_admin_session(session_token);

  insert into public.cms_assets (url, path, alt, type, size)
  values (asset_url, asset_path, asset_alt, asset_type, asset_size)
  on conflict (path) do update
    set url = excluded.url,
        alt = excluded.alt,
        type = excluded.type,
        size = excluded.size
  returning id into asset_id;

  return asset_id;
end;
$$;

alter table public.cms_pages enable row level security;
alter table public.cms_sections enable row level security;
alter table public.cms_elements enable row level security;
alter table public.cms_assets enable row level security;
alter table public.cms_versions enable row level security;
alter table public.cms_settings enable row level security;
alter table public.cms_admin_config enable row level security;
alter table public.cms_admin_sessions enable row level security;

drop policy if exists "Public can read published cms versions" on public.cms_versions;
create policy "Public can read published cms versions"
on public.cms_versions for select
to anon, authenticated
using (version_type = 'published');

drop policy if exists "Public can read cms assets" on public.cms_assets;
create policy "Public can read cms assets"
on public.cms_assets for select
to anon, authenticated
using (true);

drop policy if exists "No direct access cms pages" on public.cms_pages;
create policy "No direct access cms pages"
on public.cms_pages for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct access cms sections" on public.cms_sections;
create policy "No direct access cms sections"
on public.cms_sections for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct access cms elements" on public.cms_elements;
create policy "No direct access cms elements"
on public.cms_elements for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct access cms settings" on public.cms_settings;
create policy "No direct access cms settings"
on public.cms_settings for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct access cms admin config" on public.cms_admin_config;
create policy "No direct access cms admin config"
on public.cms_admin_config for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct access cms admin sessions" on public.cms_admin_sessions;
create policy "No direct access cms admin sessions"
on public.cms_admin_sessions for all
to anon, authenticated
using (false)
with check (false);

grant select on public.cms_versions, public.cms_assets to anon, authenticated;
grant execute on function public.cms_admin_login(text) to anon, authenticated;
grant execute on function public.cms_admin_logout(text) to anon, authenticated;
grant execute on function public.cms_get_draft(text) to anon, authenticated;
grant execute on function public.cms_get_published(text) to anon, authenticated;
grant execute on function public.cms_save_draft(text, jsonb) to anon, authenticated;
grant execute on function public.cms_publish(text, jsonb) to anon, authenticated;
grant execute on function public.cms_reset_draft(text) to anon, authenticated;
grant execute on function public.cms_record_asset(text, text, text, text, text, integer) to anon, authenticated;
grant execute on function public.cms_is_valid_admin_session_hash(text) to anon, authenticated;
revoke all on function public.cms_require_admin_session(text) from public;
revoke all on function public.cms_token_hash(text) from public;
revoke all on function public.cms_is_valid_admin_session(text) from public;

insert into storage.buckets (id, name, public)
values ('cms-assets', 'cms-assets', true)
on conflict (id) do update
  set public = true;

drop policy if exists "Public read cms assets bucket" on storage.objects;

drop policy if exists "CMS admin session upload cms assets bucket" on storage.objects;
create policy "CMS admin session upload cms assets bucket"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'cms-assets'
  and (storage.foldername(name))[1] = 'admin'
  and public.cms_is_valid_admin_session_hash((storage.foldername(name))[2])
);

drop policy if exists "CMS admin session update cms assets bucket" on storage.objects;
create policy "CMS admin session update cms assets bucket"
on storage.objects for update
to anon, authenticated
using (
  bucket_id = 'cms-assets'
  and (storage.foldername(name))[1] = 'admin'
  and public.cms_is_valid_admin_session_hash((storage.foldername(name))[2])
)
with check (
  bucket_id = 'cms-assets'
  and (storage.foldername(name))[1] = 'admin'
  and public.cms_is_valid_admin_session_hash((storage.foldername(name))[2])
);
