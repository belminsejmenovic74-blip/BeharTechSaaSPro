-- Additive safety migration. It does not delete legacy data.
-- The historical payment structures are frozen until the separately reviewed
-- purge proposal is explicitly approved.

create or replace function private.reject_legacy_payment_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'legacy_payment_storage_is_read_only';
end;
$$;

drop trigger if exists reject_legacy_payment_write on public.payments;
create trigger reject_legacy_payment_write
before insert or update or delete on public.payments
for each row execute function private.reject_legacy_payment_write();

comment on table public.payments is
  'OBSOLETE ET LECTURE SEULE : historique à inventorier puis purger après validation explicite. Aucune nouvelle écriture autorisée.';
comment on column public.payments.amount is 'OBSOLETE : montant de règlement historique, nouvelle écriture interdite.';
comment on column public.payments.method is 'OBSOLETE : moyen de règlement historique, nouvelle écriture interdite.';
comment on column public.payments.status is 'OBSOLETE : résultat de règlement historique, nouvelle écriture interdite.';
comment on column public.payments.paid_at is 'OBSOLETE : date de règlement historique, nouvelle écriture interdite.';

create or replace function private.reject_legacy_sales_payment_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.payment_status is distinct from 'draft' then
    raise exception using errcode = '42501', message = 'legacy_sales_payment_state_is_read_only';
  end if;
  if tg_op = 'UPDATE' and new.payment_status is distinct from old.payment_status then
    raise exception using errcode = '42501', message = 'legacy_sales_payment_state_is_read_only';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_legacy_sales_payment_state on public.sales;
create trigger reject_legacy_sales_payment_state
before insert or update of payment_status on public.sales
for each row execute function private.reject_legacy_sales_payment_state();

comment on column public.sales.payment_status is
  'OBSOLETE : résultat de règlement local. Valeur historique figée ; ne pas utiliser pour un calcul métier.';

create or replace function private.reject_legacy_payment_document()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.payment_id is not null
    or new.document_type in ('payment', 'payment_confirmation', 'payment_receipt', 'sale_receipt') then
    raise exception using errcode = '42501', message = 'legacy_payment_documents_are_disabled';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_legacy_payment_document on public.documents;
create trigger reject_legacy_payment_document
before insert or update of payment_id, document_type on public.documents
for each row execute function private.reject_legacy_payment_document();

comment on column public.documents.payment_id is
  'OBSOLETE : rattachement à une confirmation de règlement historique. Nouvelle écriture interdite.';

create table if not exists public.invoice_document_audit (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  invoice_id uuid not null,
  action text not null check (action in ('created', 'validated', 'update_blocked', 'delete_blocked')),
  actor_id uuid references auth.users(id) on delete set null,
  old_document jsonb,
  new_document jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invoice_document_audit_tenant_idx
  on public.invoice_document_audit(workshop_id, invoice_id, created_at desc);

alter table public.invoice_document_audit enable row level security;
alter table public.invoice_document_audit force row level security;
revoke all on public.invoice_document_audit from public, anon, authenticated;

create or replace function private.protect_finalized_invoice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if tg_op = 'DELETE' and old.status <> 'draft' then
    insert into public.invoice_document_audit (
      workshop_id, invoice_id, action, actor_id, old_document
    ) values (
      old.workshop_id, old.id, 'delete_blocked', v_actor, to_jsonb(old)
    );
    raise exception using errcode = '42501', message = 'finalized_invoice_cannot_be_deleted';
  end if;

  if tg_op = 'UPDATE' and old.status <> 'draft' and (
    new.workshop_id is distinct from old.workshop_id
    or new.shop_id is distinct from old.shop_id
    or new.client_id is distinct from old.client_id
    or new.repair_id is distinct from old.repair_id
    or new.quote_id is distinct from old.quote_id
    or new.invoice_number is distinct from old.invoice_number
    or new.status is distinct from old.status
    or new.document_type is distinct from old.document_type
    or new.issued_at is distinct from old.issued_at
    or new.total_ht is distinct from old.total_ht
    or new.total_vat is distinct from old.total_vat
    or new.total_ttc is distinct from old.total_ttc
    or new.vat_rate is distinct from old.vat_rate
    or new.vat_exemption_reason is distinct from old.vat_exemption_reason
    or new.currency is distinct from old.currency
    or new.public_token is distinct from old.public_token
    or new.public_url is distinct from old.public_url
  ) then
    insert into public.invoice_document_audit (
      workshop_id, invoice_id, action, actor_id, old_document, new_document
    ) values (
      old.workshop_id, old.id, 'update_blocked', v_actor, to_jsonb(old), to_jsonb(new)
    );
    raise exception using errcode = '42501', message = 'finalized_invoice_is_immutable_use_credit_note';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.protect_finalized_invoice() from public, anon, authenticated;

drop trigger if exists protect_finalized_invoice on public.invoices;
create trigger protect_finalized_invoice
before update or delete on public.invoices
for each row execute function private.protect_finalized_invoice();

create or replace function private.audit_invoice_document()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.invoice_document_audit (
      workshop_id, invoice_id, action, actor_id, new_document
    ) values (
      new.workshop_id,
      new.id,
      case when new.status = 'draft' then 'created' else 'validated' end,
      v_actor,
      to_jsonb(new)
    );
  elsif tg_op = 'UPDATE' and old.status = 'draft' and new.status <> 'draft' then
    insert into public.invoice_document_audit (
      workshop_id, invoice_id, action, actor_id, old_document, new_document
    ) values (
      new.workshop_id, new.id, 'validated', v_actor, to_jsonb(old), to_jsonb(new)
    );
  end if;
  return new;
end;
$$;

revoke all on function private.audit_invoice_document() from public, anon, authenticated;

drop trigger if exists audit_invoice_document on public.invoices;
create trigger audit_invoice_document
after insert or update on public.invoices
for each row execute function private.audit_invoice_document();

create or replace function private.protect_finalized_invoice_line()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice_id uuid;
  v_invoice public.invoices%rowtype;
begin
  if tg_op = 'DELETE' then
    v_invoice_id := old.invoice_id;
  elsif tg_op = 'UPDATE' then
    select * into v_invoice
    from public.invoices
    where id in (old.invoice_id, new.invoice_id) and status <> 'draft'
    limit 1;
  else
    v_invoice_id := new.invoice_id;
  end if;

  if tg_op <> 'UPDATE' then
    select * into v_invoice
    from public.invoices
    where id = v_invoice_id;
  end if;

  if v_invoice.id is not null and v_invoice.status <> 'draft' then
    raise exception using errcode = '42501', message = 'finalized_invoice_lines_are_immutable_use_credit_note';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.protect_finalized_invoice_line() from public, anon, authenticated;

drop trigger if exists protect_finalized_invoice_line on public.invoice_lines;
create trigger protect_finalized_invoice_line
before insert or update or delete on public.invoice_lines
for each row execute function private.protect_finalized_invoice_line();

create unique index if not exists invoices_tenant_number_unique
  on public.invoices(workshop_id, invoice_number);

comment on table public.invoice_document_audit is
  'Journal horodaté des documents et actions utilisateur. Ne contient aucun événement de règlement.';
