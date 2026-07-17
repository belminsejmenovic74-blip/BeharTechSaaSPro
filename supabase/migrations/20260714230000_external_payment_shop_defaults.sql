-- Fournisseur externe par défaut, strictement technique et isolé par boutique.
-- Cette migration n'ajoute aucun résultat financier et ne modifie aucune
-- facture, transaction, capture, méthode de paiement ou donnée d'abonnement.

-- Les moyens autorisés et la devise dépendent de la boutique (EUR/France ou
-- CHF/Suisse). Les boutiques existantes héritent de l'organisation une fois.
alter table public.shops
  add column if not exists country text not null default 'FR' check (country in ('FR', 'CH')),
  add column if not exists currency text not null default 'EUR' check (currency in ('EUR', 'CHF'));

update public.shops as shop
set
  country = case when workshop.country = 'CH' then 'CH' else 'FR' end,
  currency = case when workshop.currency = 'CHF' then 'CHF' else 'EUR' end
from public.workshops as workshop
where workshop.id = shop.tenant_id;

-- Les objets métier historiques ne portaient que workshop_id. Les nouvelles
-- demandes exigent désormais une facture explicitement rattachée à la même
-- boutique que la connexion fournisseur.
alter table public.repairs add column if not exists shop_id uuid;
alter table public.invoices add column if not exists shop_id uuid;

update public.repairs as repair
set shop_id = (
  select id from public.shops
  where tenant_id = repair.workshop_id and active = true
  order by created_at asc
  limit 1
)
where repair.shop_id is null;

update public.invoices as invoice
set shop_id = coalesce(
  (select repair.shop_id from public.repairs as repair where repair.id = invoice.repair_id),
  (select shop.id from public.shops as shop where shop.tenant_id = invoice.workshop_id and shop.active = true order by shop.created_at asc limit 1)
)
where invoice.shop_id is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'repairs_shop_tenant_fk') then
    alter table public.repairs add constraint repairs_shop_tenant_fk
      foreign key (workshop_id, shop_id) references public.shops(tenant_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invoices_shop_tenant_fk') then
    alter table public.invoices add constraint invoices_shop_tenant_fk
      foreign key (workshop_id, shop_id) references public.shops(tenant_id, id) on delete restrict;
  end if;
end $$;

create index if not exists invoices_workshop_shop_idx on public.invoices(workshop_id, shop_id, created_at desc);
create index if not exists repairs_workshop_shop_idx on public.repairs(workshop_id, shop_id, created_at desc);

alter table public.external_payment_connections
  add column if not exists is_default boolean not null default false;

with ranked as (
  select
    id,
    row_number() over (
      partition by workshop_id, shop_id
      order by connected_at asc, created_at asc, id asc
    ) as position
  from public.external_payment_connections
  where disconnected_at is null
)
update public.external_payment_connections as connection
set is_default = true,
    updated_at = now()
from ranked
where connection.id = ranked.id
  and ranked.position = 1
  and not exists (
    select 1
    from public.external_payment_connections existing
    where existing.workshop_id = connection.workshop_id
      and existing.shop_id = connection.shop_id
      and existing.disconnected_at is null
      and existing.is_default = true
  );

create unique index if not exists external_payment_connections_one_default_per_shop
  on public.external_payment_connections(workshop_id, shop_id)
  where is_default = true and disconnected_at is null;

alter table public.external_payment_connections enable row level security;
alter table public.external_payment_connections force row level security;

-- Les routes server-only continuent d'être l'unique point d'accès aux tokens.
revoke all on public.external_payment_connections from public, anon, authenticated;

comment on column public.external_payment_connections.is_default is
  'Fournisseur technique proposé en premier pour cette boutique ; ne représente aucun état financier.';

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
  if v_invoice.shop_id is null or v_invoice.shop_id is distinct from new.shop_id then
    raise exception 'invoice_not_in_shop';
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

alter table public.external_payment_oauth_states
  alter column redirect_path set default '/client?section=paiements';

alter table public.external_payment_oauth_states
  drop constraint if exists external_payment_oauth_states_redirect_check;

alter table public.external_payment_oauth_states
  add constraint external_payment_oauth_states_redirect_check
  check (
    redirect_path ~ '^/client(?:[/?#]|$)'
    or redirect_path ~ '^/dashboard(?:[/?#]|$)'
  );
