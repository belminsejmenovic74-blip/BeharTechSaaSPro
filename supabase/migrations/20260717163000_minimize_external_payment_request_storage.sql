-- BEHAR TECH PRO only stores the pointer to an external hosted request.
-- Existing values are intentionally preserved for inventory and an approved
-- purge; all legacy result-adjacent columns are frozen for new writes.

alter table public.external_payment_requests
  alter column requested_amount drop not null,
  alter column currency drop not null,
  alter column delivery_channel drop not null,
  alter column delivery_channel drop default,
  alter column technical_state drop not null,
  alter column technical_state drop default;

comment on column public.external_payment_requests.requested_amount is
  'OBSOLETE/FROZEN: derived transiently from invoices.total_ttc; no new value may be stored.';
comment on column public.external_payment_requests.currency is
  'OBSOLETE/FROZEN: derived transiently from the shop; no new value may be stored.';
comment on column public.external_payment_requests.delivery_channel is
  'OBSOLETE/FROZEN: UI-only transient value; no new value may be stored.';
comment on column public.external_payment_requests.technical_state is
  'OBSOLETE/FROZEN: no request state or payment result may be stored.';
comment on column public.external_payment_requests.sent_at is
  'OBSOLETE/FROZEN: no transmission or payment date may be stored.';
comment on column public.external_payment_requests.reader_id is
  'OBSOLETE/FROZEN: terminal selection is transient and must not be stored on a payment request.';
comment on column public.external_payment_requests.repair_id is
  'OBSOLETE/FROZEN: the invoice association is the sole business association.';
comment on column public.external_payment_requests.created_by is
  'OBSOLETE/FROZEN: no operator metadata is stored for a payment request.';

create or replace function private.validate_minimal_external_payment_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices%rowtype;
begin
  select * into v_invoice
  from public.invoices
  where id = new.invoice_id and workshop_id = new.workshop_id;

  if v_invoice.id is null then
    raise exception 'invoice_not_in_workshop';
  end if;
  if v_invoice.status in ('draft', 'cancelled') or coalesce(v_invoice.total_ttc, 0) <= 0 then
    raise exception 'invoice_not_finalized';
  end if;

  if tg_op = 'INSERT' then
    if new.requested_amount is not null
      or new.currency is not null
      or new.delivery_channel is not null
      or new.technical_state is not null
      or new.sent_at is not null
      or new.reader_id is not null
      or new.repair_id is not null
      or new.created_by is not null then
      raise exception 'external_payment_request_forbidden_persistence';
    end if;
  else
    if new.requested_amount is distinct from old.requested_amount
      or new.currency is distinct from old.currency
      or new.delivery_channel is distinct from old.delivery_channel
      or new.technical_state is distinct from old.technical_state
      or new.sent_at is distinct from old.sent_at
      or new.reader_id is distinct from old.reader_id
      or new.repair_id is distinct from old.repair_id
      or new.created_by is distinct from old.created_by then
      raise exception 'external_payment_request_frozen_column';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_minimal_external_payment_request() from public, anon, authenticated;

drop trigger if exists validate_external_payment_request_trigger on public.external_payment_requests;
drop trigger if exists validate_minimal_external_payment_request_trigger on public.external_payment_requests;
create trigger validate_minimal_external_payment_request_trigger
before insert or update on public.external_payment_requests
for each row execute function private.validate_minimal_external_payment_request();

comment on table public.external_payment_requests is
  'Minimal external pointer only: invoice, provider, provider request id and provider-hosted URL. No payment execution or result data.';
