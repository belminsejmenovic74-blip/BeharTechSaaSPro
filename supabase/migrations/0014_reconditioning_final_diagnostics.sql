-- Migration 0014 — Diagnostic final reconditionnement
-- Données qualité internes avant mise en vente, séparées des données publiques client.

create extension if not exists "pgcrypto";

create table if not exists public.reconditioning_final_diagnostics (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  final_grade text not null check (final_grade in ('A+', 'A', 'B', 'C', 'D')),
  battery_health integer not null check (battery_health between 0 and 100),
  warranty_months integer not null check (warranty_months > 0),
  sale_price numeric(12, 2) not null check (sale_price > 0),
  reconditioned_at timestamptz not null,
  validated_at timestamptz,
  validated_by text,
  public_comment text,
  tested_points_count integer not null default 0 check (tested_points_count >= 0),
  total_points_count integer not null default 0 check (total_points_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id)
);

create table if not exists public.reconditioning_test_results (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  category text not null,
  test_key text not null,
  label text not null,
  state text not null default 'not_tested'
    check (state in ('not_tested', 'ok', 'to_check', 'final_defect', 'not_applicable')),
  internal_note text,
  public_visible boolean not null default false,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, category, test_key)
);

create index if not exists reconditioning_final_diagnostics_device_id_idx
  on public.reconditioning_final_diagnostics (device_id);

create index if not exists reconditioning_test_results_device_id_idx
  on public.reconditioning_test_results (device_id);

create index if not exists reconditioning_test_results_state_idx
  on public.reconditioning_test_results (state);

drop trigger if exists touch_reconditioning_final_diagnostics_updated_at on public.reconditioning_final_diagnostics;
create trigger touch_reconditioning_final_diagnostics_updated_at
before update on public.reconditioning_final_diagnostics
for each row execute function public.touch_updated_at();

drop trigger if exists touch_reconditioning_test_results_updated_at on public.reconditioning_test_results;
create trigger touch_reconditioning_test_results_updated_at
before update on public.reconditioning_test_results
for each row execute function public.touch_updated_at();
