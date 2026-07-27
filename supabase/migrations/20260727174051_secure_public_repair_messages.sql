-- Durcit l'isolation des messages publics et stocke un identifiant
-- d'idempotence généré par le navigateur. La migration ne supprime aucune donnée.

alter table public.repairs
  add constraint repairs_workshop_id_id_key unique (workshop_id, id);

alter table public.repair_messages
  add column if not exists client_message_id text;

create unique index if not exists repair_messages_client_idempotency_idx
  on public.repair_messages (repair_id, client_message_id)
  where client_message_id is not null;

create index if not exists repair_messages_public_poll_idx
  on public.repair_messages (repair_id, visibility, created_at asc);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'repair_messages_repair_workshop_fk'
      and conrelid = 'public.repair_messages'::regclass
  ) then
    alter table public.repair_messages
      add constraint repair_messages_repair_workshop_fk
      foreign key (workshop_id, repair_id)
      references public.repairs (workshop_id, id)
      on delete cascade
      not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'repair_messages_body_length_check'
      and conrelid = 'public.repair_messages'::regclass
  ) then
    alter table public.repair_messages
      add constraint repair_messages_body_length_check
      check (char_length(btrim(body)) between 1 and 1000)
      not valid;
  end if;
end
$$;

alter table public.stock_items
  add column if not exists average_purchase_price numeric,
  add column if not exists last_purchase_price numeric,
  add column if not exists purchase_currency text;

update public.stock_items
set
  average_purchase_price = coalesce(average_purchase_price, purchase_price, 0),
  last_purchase_price = coalesce(last_purchase_price, purchase_price, 0),
  purchase_currency = coalesce(purchase_currency, 'EUR')
where average_purchase_price is null
   or last_purchase_price is null
   or purchase_currency is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stock_items_non_negative_costs_check'
      and conrelid = 'public.stock_items'::regclass
  ) then
    alter table public.stock_items
      add constraint stock_items_non_negative_costs_check
      check (
        quantity >= 0
        and coalesce(purchase_price, 0) >= 0
        and coalesce(average_purchase_price, 0) >= 0
        and coalesce(last_purchase_price, 0) >= 0
      )
      not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'stock_items_purchase_currency_check'
      and conrelid = 'public.stock_items'::regclass
  ) then
    alter table public.stock_items
      add constraint stock_items_purchase_currency_check
      check (purchase_currency in ('EUR', 'CHF'))
      not valid;
  end if;
end
$$;

comment on column public.repair_messages.client_message_id is
  'Identifiant opaque d idempotence créé côté client, unique par dossier.';
comment on column public.stock_items.average_purchase_price is
  'Prix moyen pondéré HT de la quantité actuellement en stock.';

-- Écriture atomique réservée au backend : le verrou FOR UPDATE empêche deux
-- réceptions concurrentes de calculer leur moyenne sur le même ancien stock.
create or replace function public.record_stock_receipt(
  p_workshop_id uuid,
  p_stock_item_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_currency text,
  p_source_id text default null,
  p_reason text default 'Réception stock'
)
returns table (quantity numeric, average_purchase_price numeric)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_before numeric;
  v_average numeric;
  v_after numeric;
  v_next_average numeric;
begin
  if p_quantity <= 0 or p_unit_cost < 0 then
    raise exception 'quantity must be positive and unit cost non-negative';
  end if;
  if p_currency not in ('EUR', 'CHF') then
    raise exception 'unsupported currency';
  end if;

  select
    coalesce(si.quantity, 0),
    coalesce(si.average_purchase_price, si.purchase_price, 0)
  into v_before, v_average
  from public.stock_items si
  where si.id = p_stock_item_id
    and si.workshop_id = p_workshop_id
  for update;

  if not found then
    raise exception 'stock item not found for workshop';
  end if;

  v_after := v_before + p_quantity;
  v_next_average := round(((v_before * v_average) + (p_quantity * p_unit_cost)) / v_after, 2);

  update public.stock_items
  set
    quantity = v_after,
    purchase_price = p_unit_cost,
    average_purchase_price = v_next_average,
    last_purchase_price = p_unit_cost,
    purchase_currency = p_currency,
    updated_at = now()
  where id = p_stock_item_id
    and workshop_id = p_workshop_id;

  insert into public.stock_movements (
    shop_id,
    stock_item_id,
    movement_type,
    quantity_delta,
    quantity_before,
    quantity_after,
    unit_cost,
    total_cost,
    reason,
    source_module,
    source_id,
    created_at,
    metadata
  ) values (
    p_workshop_id::text,
    p_stock_item_id::text,
    'supplier_purchase_received',
    p_quantity,
    v_before,
    v_after,
    p_unit_cost,
    round(p_quantity * p_unit_cost, 2),
    p_reason,
    'achats',
    p_source_id,
    now(),
    jsonb_build_object('currency', p_currency, 'atomic', true)
  );

  return query select v_after, v_next_average;
end;
$$;

revoke all on function public.record_stock_receipt(uuid, uuid, numeric, numeric, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_stock_receipt(uuid, uuid, numeric, numeric, text, text, text)
  to service_role;

-- Les snapshots passent désormais exclusivement par /api/behar/snapshot :
-- validation de licence + liaison licence/atelier avant usage du service_role.
drop policy if exists "anon_can_insert_snapshot" on public.workshop_snapshots;
drop policy if exists "anon_can_select_snapshot" on public.workshop_snapshots;
drop policy if exists "anon_can_update_snapshot" on public.workshop_snapshots;
revoke all on public.workshop_snapshots from anon, authenticated;
revoke all on function public.snapshot_pull(text) from public, anon, authenticated;
revoke all on function public.snapshot_meta(text) from public, anon, authenticated;
revoke all on function public.snapshot_push(text, uuid, text, text, jsonb, integer, integer)
  from public, anon, authenticated;

-- La publication métier est réalisée avec le service_role côté serveur. Les
-- visiteurs ne doivent jamais pouvoir créer ou remplacer une vue publique.
drop policy if exists "public_tracking_anon_insert" on public.public_tracking_repairs;
drop policy if exists "public_tracking_anon_update" on public.public_tracking_repairs;
revoke insert, update, delete on public.public_tracking_repairs from anon, authenticated;

drop policy if exists "public_tracking_docs_anon_insert" on public.public_tracking_documents;
drop policy if exists "public_tracking_docs_anon_update" on public.public_tracking_documents;
revoke insert, update, delete on public.public_tracking_documents from anon, authenticated;
