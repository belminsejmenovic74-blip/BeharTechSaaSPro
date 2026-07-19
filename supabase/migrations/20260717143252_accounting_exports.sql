-- Export des factures pour le comptable : colonnes documentaires et historique
-- server-only. Aucune donnée de règlement n'est lue ou ajoutée.

alter table public.clients
  add column if not exists company_name text,
  add column if not exists siret text,
  add column if not exists vat_number text;

alter table public.invoices
  add column if not exists document_type text not null default 'invoice',
  add column if not exists issued_at timestamptz,
  add column if not exists validated_at timestamptz,
  add column if not exists currency text,
  add column if not exists total_vat numeric(14,2),
  add column if not exists vat_rate numeric(7,4),
  add column if not exists vat_exemption_reason text;

update public.invoices as invoice
set
  issued_at = coalesce(invoice.issued_at, invoice.created_at),
  validated_at = case
    when invoice.status <> 'draft' then coalesce(invoice.validated_at, invoice.updated_at, invoice.created_at)
    else invoice.validated_at
  end,
  currency = coalesce(invoice.currency, workshop.currency, 'EUR'),
  total_vat = coalesce(invoice.total_vat, round(coalesce(invoice.total_ttc, 0) - coalesce(invoice.total_ht, 0), 2)),
  vat_rate = coalesce(
    invoice.vat_rate,
    case
      when coalesce(invoice.total_ht, 0) <> 0
        then round(((coalesce(invoice.total_ttc, 0) - coalesce(invoice.total_ht, 0)) / invoice.total_ht) * 100, 4)
      else 0
    end
  )
from public.workshops as workshop
where workshop.id = invoice.workshop_id;

alter table public.invoices
  alter column issued_at set default now(),
  drop constraint if exists invoices_document_type_check,
  drop constraint if exists invoices_currency_check;

alter table public.invoices
  add constraint invoices_document_type_check check (document_type in ('invoice', 'credit_note')),
  add constraint invoices_currency_check check (currency is null or currency in ('EUR', 'CHF'));

create index if not exists invoices_accounting_period_idx
  on public.invoices(workshop_id, shop_id, issued_at desc)
  where status <> 'draft';

create table if not exists public.accounting_exports (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  shop_id uuid,
  period_start date not null,
  period_end date not null,
  generated_by text not null,
  generated_by_name text not null,
  file_type text not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  checksum_sha256 text not null,
  invoice_count integer not null check (invoice_count >= 0),
  filters jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint accounting_exports_period_check check (period_end >= period_start),
  constraint accounting_exports_file_type_check check (file_type in ('csv', 'xlsx', 'zip')),
  constraint accounting_exports_shop_tenant_fk
    foreign key (workshop_id, shop_id) references public.shops(tenant_id, id) on delete restrict,
  constraint accounting_exports_filters_object_check check (jsonb_typeof(filters) = 'object'),
  constraint accounting_exports_warnings_array_check check (jsonb_typeof(warnings) = 'array')
);

create index if not exists accounting_exports_workshop_created_idx
  on public.accounting_exports(workshop_id, created_at desc);
create index if not exists accounting_exports_workshop_shop_created_idx
  on public.accounting_exports(workshop_id, shop_id, created_at desc);

alter table public.accounting_exports enable row level security;
alter table public.accounting_exports force row level security;
revoke all on public.accounting_exports from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'accounting-exports',
  'accounting-exports',
  false,
  62914560,
  array[
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.accounting_exports is
  'Historique server-only des exports comptables générés par organisation et, éventuellement, boutique.';
