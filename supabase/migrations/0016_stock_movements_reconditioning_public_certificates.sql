-- Migration 0016 — Ledger stock + certificats publics reconditionnement live
-- Non destructive : ajoute les tables/colonnes de traçabilité sans supprimer l'existant.

create extension if not exists "pgcrypto";

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id text,
  shop_id text,
  stock_item_id text not null,
  movement_type text not null check (
    movement_type in (
      'supplier_purchase_received',
      'manual_adjustment',
      'repair_part_used',
      'reconditioning_part_used',
      'counter_sale_sold',
      'reconditioned_device_sold',
      'reservation_created',
      'reservation_released',
      'return_to_supplier',
      'stock_transfer_out',
      'stock_transfer_in',
      'correction'
    )
  ),
  quantity_delta numeric(12, 2) not null,
  quantity_before numeric(12, 2) not null,
  quantity_after numeric(12, 2) not null,
  unit_cost numeric(12, 2),
  total_cost numeric(12, 2),
  reason text,
  source_module text not null check (
    source_module in ('stock', 'achats', 'atelier_reparation', 'reconditionnement', 'vente_comptoir')
  ),
  source_id text,
  linked_repair_id text,
  linked_reconditioning_device_id text,
  linked_sale_id text,
  linked_purchase_id text,
  linked_supplier_invoice_id text,
  actor_id text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists stock_movements_stock_item_created_idx
  on public.stock_movements (stock_item_id, created_at desc);

create index if not exists stock_movements_source_idx
  on public.stock_movements (source_module, source_id);

create index if not exists stock_movements_reconditioning_idx
  on public.stock_movements (linked_reconditioning_device_id, created_at desc);

alter table public.stock_items
  add column if not exists reconditioning_file_id text;

create table if not exists public.reconditioning_public_certificates (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  public_token text not null unique,
  workshop_id text,
  display_payload jsonb not null default '{}'::jsonb,
  status text,
  sold_at timestamptz,
  sale_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reconditioning_public_certificates_device_idx
  on public.reconditioning_public_certificates (device_id);

drop trigger if exists touch_reconditioning_public_certificates_updated_at on public.reconditioning_public_certificates;
create trigger touch_reconditioning_public_certificates_updated_at
before update on public.reconditioning_public_certificates
for each row execute function public.touch_updated_at();
