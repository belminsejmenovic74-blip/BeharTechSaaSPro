-- Behar Tech Pro - demandes de paiement externes uniquement.
-- Cette migration est volontairement non destructive : les anciennes donnees
-- de reglement sont conservees pour permettre une reprise juridique separee.

create extension if not exists pgcrypto;

create unique index if not exists invoices_workshop_id_id_key
  on public.invoices(workshop_id, id);
create unique index if not exists repairs_workshop_id_id_key
  on public.repairs(workshop_id, id);

create table if not exists public.external_payment_connections (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  shop_id uuid not null,
  provider text not null check (provider in ('stripe', 'sumup', 'paypal', 'square')),
  external_account_id text not null,
  external_location_id text,
  merchant_display_name text,
  connection_mode text not null default 'oauth'
    check (
      (provider in ('stripe', 'sumup', 'square') and connection_mode = 'oauth')
      or (provider = 'paypal' and connection_mode in ('manual', 'commerce'))
    ),
  encrypted_configuration text,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  granted_scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_payment_connections_shop_fk
    foreign key (workshop_id, shop_id)
    references public.shops(tenant_id, id) on delete cascade,
  constraint external_payment_connections_tokens_check check (
    provider in ('sumup', 'square')
    or (encrypted_access_token is null and encrypted_refresh_token is null and token_expires_at is null)
  ),
  constraint external_payment_connections_configuration_check check (
    (provider = 'paypal' and connection_mode = 'manual' and (encrypted_configuration is not null or disconnected_at is not null))
    or (not (provider = 'paypal' and connection_mode = 'manual') and encrypted_configuration is null)
  )
);

create unique index if not exists external_payment_connections_active_unique
  on public.external_payment_connections(workshop_id, shop_id, provider)
  where disconnected_at is null;

create index if not exists external_payment_connections_tenant_idx
  on public.external_payment_connections(workshop_id, shop_id, provider, connected_at desc);

create table if not exists public.external_payment_requests (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  shop_id uuid not null,
  invoice_id uuid not null,
  repair_id uuid,
  reader_id text,
  provider text not null check (provider in ('stripe', 'sumup', 'paypal', 'square')),
  requested_amount numeric(14, 2) not null check (requested_amount > 0),
  currency text not null check (currency in ('EUR', 'CHF')),
  provider_request_id text,
  hosted_url text,
  delivery_channel text not null default 'link'
    check (delivery_channel in ('link', 'sms', 'email', 'qr', 'terminal')),
  technical_state text not null default 'created'
    check (technical_state in ('created', 'sent', 'dispatch_error')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint external_payment_requests_shop_fk
    foreign key (workshop_id, shop_id)
    references public.shops(tenant_id, id) on delete cascade,
  constraint external_payment_requests_invoice_fk
    foreign key (workshop_id, invoice_id)
    references public.invoices(workshop_id, id) on delete restrict,
  constraint external_payment_requests_repair_fk
    foreign key (workshop_id, repair_id)
    references public.repairs(workshop_id, id) on delete set null,
  constraint external_payment_requests_terminal_provider_check check (
    delivery_channel <> 'terminal' or (provider in ('sumup', 'square') and reader_id is not null)
  )
);

create unique index if not exists external_payment_requests_provider_id_unique
  on public.external_payment_requests(provider, provider_request_id)
  where provider_request_id is not null;

create unique index if not exists external_payment_requests_invoice_channel_unique
  on public.external_payment_requests(workshop_id, shop_id, invoice_id, provider, delivery_channel);

create index if not exists external_payment_requests_tenant_idx
  on public.external_payment_requests(workshop_id, shop_id, created_at desc);

create table if not exists public.external_payment_readers (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  shop_id uuid not null,
  provider text not null default 'sumup' check (provider in ('sumup', 'square')),
  reader_id text not null,
  reader_name text not null,
  location_id text,
  active boolean not null default true,
  connected_at timestamptz not null default now(),
  constraint external_payment_readers_shop_fk
    foreign key (workshop_id, shop_id)
    references public.shops(tenant_id, id) on delete cascade,
  unique (workshop_id, shop_id, provider, reader_id)
);

alter table public.external_payment_requests
  add constraint external_payment_requests_reader_fk
  foreign key (workshop_id, shop_id, provider, reader_id)
  references public.external_payment_readers(workshop_id, shop_id, provider, reader_id) on delete restrict;

-- Etats OAuth haches, a usage unique et sans jeton fournisseur.
create table if not exists public.external_payment_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  shop_id uuid not null,
  provider text not null check (provider in ('stripe', 'sumup', 'paypal', 'square')),
  created_by uuid references auth.users(id) on delete set null,
  redirect_path text not null default '/dashboard/parametres',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint external_payment_oauth_states_shop_fk
    foreign key (workshop_id, shop_id)
    references public.shops(tenant_id, id) on delete cascade,
  constraint external_payment_oauth_states_redirect_check
    check (redirect_path ~ '^/dashboard(?:/|$)')
);

create index if not exists external_payment_oauth_states_expiry_idx
  on public.external_payment_oauth_states(expires_at)
  where consumed_at is null;

-- Defense en profondeur : le montant et les rattachements doivent encore
-- correspondre a la facture finalisee au moment de l'insertion.
create or replace function public.validate_external_payment_request()
returns trigger
language plpgsql
security invoker
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
  if v_invoice.status in ('draft', 'cancelled') then
    raise exception 'invoice_not_finalized';
  end if;
  if v_invoice.total_ttc is null or round(v_invoice.total_ttc::numeric, 2) <> round(new.requested_amount, 2) then
    raise exception 'requested_amount_must_equal_invoice_total_ttc';
  end if;
  if new.repair_id is distinct from v_invoice.repair_id then
    raise exception 'repair_must_match_invoice';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_external_payment_request_trigger on public.external_payment_requests;
create trigger validate_external_payment_request_trigger
before insert or update of workshop_id, invoice_id, repair_id, requested_amount
on public.external_payment_requests
for each row execute function public.validate_external_payment_request();

do $$
declare t text;
begin
  foreach t in array array[
    'external_payment_connections',
    'external_payment_requests',
    'external_payment_readers',
    'external_payment_oauth_states'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end;
$$;

drop policy if exists external_payment_connections_manage on public.external_payment_connections;
create policy external_payment_connections_manage on public.external_payment_connections
for all to authenticated
using (private.can_manage(workshop_id))
with check (private.can_manage(workshop_id));

drop policy if exists external_payment_requests_read on public.external_payment_requests;
create policy external_payment_requests_read on public.external_payment_requests
for select to authenticated
using (private.member_of(workshop_id));

drop policy if exists external_payment_requests_manage on public.external_payment_requests;
create policy external_payment_requests_manage on public.external_payment_requests
for insert to authenticated
with check (private.can_manage(workshop_id));

drop policy if exists external_payment_readers_manage on public.external_payment_readers;
create policy external_payment_readers_manage on public.external_payment_readers
for all to authenticated
using (private.can_manage(workshop_id))
with check (private.can_manage(workshop_id));

-- Les nonces OAuth sont exclusivement manipules par les routes server-only.
revoke all on public.external_payment_oauth_states from public, anon, authenticated;
revoke all on public.external_payment_connections from public, anon, authenticated;
revoke all on public.external_payment_requests from public, anon, authenticated;
revoke all on public.external_payment_readers from public, anon, authenticated;

comment on table public.external_payment_requests is
  'Demandes techniques externes uniquement. Aucun resultat financier, statut de paiement, remboursement ou transaction finale.';
comment on column public.external_payment_requests.technical_state is
  'Etat de transmission technique uniquement, jamais un resultat financier.';
comment on table public.external_payment_connections is
  'Connexions marchandes distinctes du systeme Stripe des abonnements Behar Tech Pro.';
