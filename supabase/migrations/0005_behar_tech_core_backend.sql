-- Migration 0005 — Behar Tech Pro normalized backend
-- Runtime public client pages use Next.js API routes with SUPABASE_SERVICE_ROLE_KEY.

create extension if not exists "pgcrypto";

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  commercial_name text,
  brand text,
  logo_url text,
  phone text,
  email text,
  address text,
  postal_code text,
  city text,
  siret text,
  siren text,
  vat_regime text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  auth_user_id uuid,
  name text not null,
  role text not null,
  pin_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, id)
);

create table if not exists public.repairs (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  repair_number text not null,
  device_brand text,
  device_model text,
  device_type text,
  imei text,
  serial_number text,
  issue_description text not null default '',
  intervention_label text,
  customer_price numeric,
  status text not null default 'received'
    check (status in ('received', 'diagnosis', 'repair', 'final_test', 'ready', 'delivered', 'cancelled')),
  assigned_to uuid references public.team_members(id) on delete set null,
  public_token text not null unique,
  public_url text not null,
  public_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, repair_number)
);

create table if not exists public.repair_events (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  repair_id uuid not null references public.repairs(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  visibility text not null default 'internal' check (visibility in ('internal', 'client', 'system')),
  created_by uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.repair_messages (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  repair_id uuid not null references public.repairs(id) on delete cascade,
  author_type text not null check (author_type in ('staff', 'client', 'system')),
  author_name text not null,
  visibility text not null check (visibility in ('internal', 'client')),
  body text not null,
  read_by_client boolean not null default false,
  read_by_staff boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  repair_id uuid references public.repairs(id) on delete set null,
  quote_number text not null,
  status text not null default 'draft',
  total_ht numeric,
  total_ttc numeric,
  public_token text not null unique,
  public_url text not null,
  public_active boolean not null default true,
  accepted_at timestamptz,
  refused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, quote_number)
);

create table if not exists public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  label text not null,
  quantity numeric not null default 1,
  unit_price_ttc numeric not null default 0,
  total_ttc numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  repair_id uuid references public.repairs(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  invoice_number text not null,
  status text not null default 'draft',
  total_ht numeric,
  total_ttc numeric,
  public_token text not null unique,
  public_url text not null,
  public_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, invoice_number)
);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  label text not null,
  quantity numeric not null default 1,
  unit_price_ttc numeric not null default 0,
  total_ttc numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  repair_id uuid references public.repairs(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  payment_number text not null,
  amount numeric not null default 0,
  method text not null,
  status text not null default 'paid',
  paid_at timestamptz,
  public_token text not null unique,
  public_url text not null,
  public_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, payment_number)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  sale_number text not null,
  total_ttc numeric not null default 0,
  payment_status text not null default 'draft',
  public_token text not null unique,
  public_url text not null,
  public_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, sale_number)
);

create table if not exists public.sale_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  stock_item_id uuid,
  label text not null,
  quantity numeric not null default 1,
  unit_price_ttc numeric not null default 0,
  total_ttc numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  repair_id uuid references public.repairs(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete cascade,
  document_type text not null check (
    document_type in (
      'repair_intake',
      'quote',
      'invoice',
      'payment_receipt',
      'sale_receipt',
      'internal_intervention_sheet',
      'repair_summary'
    )
  ),
  document_number text,
  title text not null,
  public_visible boolean not null default false,
  public_token text unique,
  public_url text,
  file_url text,
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_documents_private check (
    document_type <> 'internal_intervention_sheet' or public_visible = false
  )
);

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  sku text,
  name text not null,
  category text,
  purchase_price numeric,
  sale_price numeric,
  quantity numeric not null default 0,
  threshold numeric,
  supplier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null unique references public.workshops(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_repairs_public_token on public.repairs(public_token) where public_active = true;
create index if not exists idx_quotes_public_token on public.quotes(public_token) where public_active = true;
create index if not exists idx_invoices_public_token on public.invoices(public_token) where public_active = true;
create index if not exists idx_payments_public_token on public.payments(public_token) where public_active = true;
create index if not exists idx_sales_public_token on public.sales(public_token) where public_active = true;
create index if not exists idx_repair_messages_repair_id on public.repair_messages(repair_id, created_at);
create index if not exists idx_repair_events_repair_id on public.repair_events(repair_id, created_at);

do $$
declare
  t text;
begin
  foreach t in array array[
    'workshops',
    'team_members',
    'clients',
    'repairs',
    'repair_events',
    'repair_messages',
    'quotes',
    'quote_lines',
    'invoices',
    'invoice_lines',
    'payments',
    'sales',
    'sale_lines',
    'documents',
    'stock_items',
    'app_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop trigger if exists trg_%I_touch on public.%I', t, t);
    if t not in ('repair_events', 'repair_messages', 'quote_lines', 'invoice_lines', 'sale_lines') then
      execute format(
        'create trigger trg_%I_touch before update on public.%I for each row execute function public.touch_updated_at()',
        t,
        t
      );
    end if;
  end loop;
end;
$$;

-- No anon table policies here: dashboard writes and public reads go through Next.js API routes.
-- Service role bypasses RLS server-side. Future Supabase Auth policies can be added per workshop_id.
