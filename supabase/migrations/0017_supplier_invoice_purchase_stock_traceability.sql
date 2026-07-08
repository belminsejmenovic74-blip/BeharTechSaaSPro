-- Migration 0017 — Traçabilité achats/factures fournisseurs/stock/réparations
-- Non destructive : ajoute le modèle cible sans supprimer ni renommer les champs existants.

create extension if not exists "pgcrypto";

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid references public.workshops(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  vat_number text,
  notes text,
  created_by text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_workshop_name_unique unique (workshop_id, name)
);

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid references public.workshops(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_name text not null,
  purchase_date timestamptz not null default now(),
  invoice_number text not null,
  original_file_name text,
  original_file_url text,
  original_document_id uuid references public.documents(id) on delete set null,
  total_ht numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_ttc numeric(12, 2) not null default 0,
  status text not null default 'reçu' check (status in ('brouillon', 'reçu', 'partiel', 'annulé')),
  source text not null default 'manuel' check (source in ('manuel', 'textract')),
  textract_json jsonb,
  created_by text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_invoices_workshop_supplier_number_unique unique (workshop_id, supplier_id, invoice_number)
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid references public.workshops(id) on delete cascade,
  shop_id text,
  number text not null,
  kind text not null default 'piece',
  source text not null default 'Manuel',
  label text not null,
  reference text,
  internal_code text,
  category text,
  compatible_model text,
  quality text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_name text,
  invoice_number text,
  quantity numeric(12, 2) not null default 0,
  unit_cost numeric(12, 2) not null default 0,
  tax_rate numeric(7, 3),
  tax_amount numeric(12, 2),
  total_ht numeric(12, 2),
  total_ttc numeric(12, 2),
  total numeric(12, 2) not null default 0,
  currency text,
  purchase_date timestamptz not null default now(),
  stock_item_id uuid references public.stock_items(id) on delete set null,
  supplier_invoice_id uuid references public.supplier_invoices(id) on delete set null,
  supplier_invoice_line_id uuid,
  document_id uuid references public.documents(id) on delete set null,
  original_file_name text,
  original_file_url text,
  repair_id uuid references public.repairs(id) on delete set null,
  reconditioning_file_id text,
  conditionne_record_id text,
  note text,
  created_by text,
  created_by_name text,
  created_at timestamptz not null default now(),
  constraint purchases_workshop_number_unique unique (workshop_id, number)
);

create table if not exists public.supplier_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid references public.workshops(id) on delete cascade,
  supplier_invoice_id uuid not null references public.supplier_invoices(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete set null,
  stock_item_id uuid references public.stock_items(id) on delete set null,
  item_name text not null,
  reference text,
  sku text,
  internal_code text,
  category text,
  compatible_model text,
  quality text,
  quantity_purchased numeric(12, 2) not null default 0,
  unit_purchase_price_ht numeric(12, 2) not null default 0,
  tax_rate numeric(7, 3),
  tax_amount numeric(12, 2),
  line_total_ht numeric(12, 2) not null default 0,
  line_total_ttc numeric(12, 2),
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_name text,
  invoice_id uuid references public.supplier_invoices(id) on delete cascade,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchases_supplier_invoice_line_fk'
      and conrelid = 'public.purchases'::regclass
  ) then
    alter table public.purchases
      add constraint purchases_supplier_invoice_line_fk
      foreign key (supplier_invoice_line_id) references public.supplier_invoice_lines(id) on delete set null
      not valid;
  end if;
end;
$$;

alter table public.stock_items
  add column if not exists internal_code text,
  add column if not exists quality text,
  add column if not exists average_purchase_price numeric(12, 2),
  add column if not exists last_purchase_price numeric(12, 2),
  add column if not exists primary_supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists primary_supplier_name text,
  add column if not exists origin_purchase_id uuid references public.purchases(id) on delete set null,
  add column if not exists origin_supplier_invoice_id uuid references public.supplier_invoices(id) on delete set null,
  add column if not exists origin_supplier_invoice_number text,
  add column if not exists origin_supplier_invoice_line_id uuid;

alter table public.stock_movements
  add column if not exists part_reference text,
  add column if not exists internal_code text,
  add column if not exists linked_supplier_invoice_line_id uuid references public.supplier_invoice_lines(id) on delete set null,
  add column if not exists actor_name text,
  add column if not exists note text;

create index if not exists suppliers_workshop_name_idx
  on public.suppliers (workshop_id, name);

create index if not exists supplier_invoices_workshop_date_idx
  on public.supplier_invoices (workshop_id, purchase_date desc);

create index if not exists supplier_invoices_number_idx
  on public.supplier_invoices (invoice_number);

create index if not exists purchases_workshop_date_idx
  on public.purchases (workshop_id, purchase_date desc);

create index if not exists purchases_stock_item_idx
  on public.purchases (stock_item_id, purchase_date desc);

create index if not exists supplier_invoice_lines_invoice_idx
  on public.supplier_invoice_lines (supplier_invoice_id);

create index if not exists supplier_invoice_lines_stock_item_idx
  on public.supplier_invoice_lines (stock_item_id);

create index if not exists stock_items_internal_code_idx
  on public.stock_items (workshop_id, internal_code);

create index if not exists stock_movements_supplier_invoice_line_idx
  on public.stock_movements (linked_supplier_invoice_line_id, created_at desc);

do $$
declare
  t text;
begin
  alter table public.stock_movements enable row level security;

  foreach t in array array[
    'suppliers',
    'supplier_invoices',
    'supplier_invoice_lines',
    'purchases'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop trigger if exists trg_%I_touch on public.%I', t, t);
    if t in ('suppliers', 'supplier_invoices') then
      execute format(
        'create trigger trg_%I_touch before update on public.%I for each row execute function public.touch_updated_at()',
        t,
        t
      );
    end if;
  end loop;
end;
$$;

-- Le dashboard écrit via les API Next.js côté serveur/service role.
-- Pas de politique anon/authenticated ouverte par défaut.
