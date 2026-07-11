-- Médiathèque de marque du widget. Les fichiers sont rendus publics car ils
-- font partie de l'identité publiée de la boutique ; seuls les appels serveur
-- sous licence peuvent écrire ou supprimer des objets.

create table public.widget_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  widget_id uuid not null,
  asset_kind text not null default 'icon',
  target_key text,
  storage_path text not null,
  public_url text not null,
  original_name text not null,
  mime_type text not null,
  byte_size integer not null,
  width integer not null,
  height integer not null,
  created_at timestamptz not null default now(),
  constraint widget_assets_widget_tenant_fk
    foreign key (tenant_id, widget_id)
    references public.widget_settings(tenant_id, id) on delete cascade,
  constraint widget_assets_storage_path_key unique (storage_path),
  constraint widget_assets_kind_check check (asset_kind in ('icon', 'image')),
  constraint widget_assets_target_check check (
    target_key is null or target_key in (
      'phone', 'tablet', 'computer', 'console', 'battery',
      'screen', 'charging', 'appointment', 'confirmation'
    )
  ),
  constraint widget_assets_mime_check check (mime_type in ('image/webp', 'image/png', 'image/jpeg')),
  constraint widget_assets_size_check check (byte_size between 1 and 524288),
  constraint widget_assets_dimensions_check check (width between 1 and 512 and height between 1 and 512)
);

create index idx_widget_assets_widget_created
  on public.widget_assets (tenant_id, widget_id, created_at desc);

alter table public.widget_assets enable row level security;
revoke all on table public.widget_assets from anon, authenticated;
grant all on table public.widget_assets to service_role;

create policy "widget_assets_deny_anon"
  on public.widget_assets for all to anon using (false) with check (false);
create policy "widget_assets_deny_authenticated"
  on public.widget_assets for all to authenticated using (false) with check (false);

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'widget-brand-assets',
  'widget-brand-assets',
  true,
  524288,
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
