-- Migration 0015 — Publication client et médias reconditionnement
-- Non destructive : ajoute les tables nécessaires au QR public et aux images.

create extension if not exists "pgcrypto";

create table if not exists public.reconditioning_public_settings (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  show_shop_name boolean not null default true,
  show_shop_logo boolean not null default true,
  show_price boolean not null default true,
  show_grade boolean not null default true,
  show_battery boolean not null default true,
  show_warranty boolean not null default true,
  show_reconditioned_date boolean not null default true,
  show_reference boolean not null default true,
  show_masked_imei boolean not null default false,
  show_final_diagnostic boolean not null default true,
  show_control_points boolean not null default true,
  show_public_photos boolean not null default true,
  show_public_comment boolean not null default true,
  show_powered_by boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reconditioning_public_test_visibility (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  test_key text not null,
  visible_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, test_key)
);

create table if not exists public.reconditioning_device_media (
  id uuid primary key default gen_random_uuid(),
  organization_id text,
  shop_id text,
  device_id text not null,
  storage_bucket text not null default 'reconditioning-media',
  storage_path text,
  public_url text,
  media_type text not null default 'image',
  visibility text not null check (visibility in ('internal_purchase', 'internal_workshop', 'public_sale')),
  is_public boolean not null default false,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  file_name text,
  mime_type text,
  file_size bigint,
  uploaded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reconditioning_public_test_visibility_device_idx
  on public.reconditioning_public_test_visibility (device_id);

create index if not exists reconditioning_device_media_device_visibility_idx
  on public.reconditioning_device_media (device_id, visibility, is_public);

drop trigger if exists touch_reconditioning_public_settings_updated_at on public.reconditioning_public_settings;
create trigger touch_reconditioning_public_settings_updated_at
before update on public.reconditioning_public_settings
for each row execute function public.touch_updated_at();

drop trigger if exists touch_reconditioning_public_test_visibility_updated_at on public.reconditioning_public_test_visibility;
create trigger touch_reconditioning_public_test_visibility_updated_at
before update on public.reconditioning_public_test_visibility
for each row execute function public.touch_updated_at();

drop trigger if exists touch_reconditioning_device_media_updated_at on public.reconditioning_device_media;
create trigger touch_reconditioning_device_media_updated_at
before update on public.reconditioning_device_media
for each row execute function public.touch_updated_at();

create or replace view public.public_reconditioned_device_view as
select
  d.device_id,
  d.final_grade,
  d.battery_health,
  d.warranty_months,
  d.sale_price,
  d.reconditioned_at,
  d.public_comment,
  d.tested_points_count,
  d.total_points_count,
  s.show_shop_name,
  s.show_shop_logo,
  s.show_price,
  s.show_grade,
  s.show_battery,
  s.show_warranty,
  s.show_reconditioned_date,
  s.show_reference,
  s.show_masked_imei,
  s.show_final_diagnostic,
  s.show_control_points,
  s.show_public_photos,
  s.show_public_comment,
  s.show_powered_by
from public.reconditioning_final_diagnostics d
left join public.reconditioning_public_settings s on s.device_id = d.device_id;
