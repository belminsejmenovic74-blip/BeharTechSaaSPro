-- Widget client : disponibilité publique calculée depuis le stock réel.
-- Migration strictement additive. Les données commerciales internes ne sont
-- jamais exposées et les rôles publics ne reçoivent aucun accès direct.

alter table public.stock_items
  add column if not exists source_shop_key text not null default 'shop-default',
  add column if not exists physical_quantity numeric(12, 2),
  add column if not exists sellable_status text not null default 'sellable';

update public.stock_items
set physical_quantity = quantity
where physical_quantity is null;

alter table public.stock_items
  alter column physical_quantity set default 0,
  alter column physical_quantity set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stock_items_sellable_status_check'
      and conrelid = 'public.stock_items'::regclass
  ) then
    alter table public.stock_items
      add constraint stock_items_sellable_status_check
      check (sellable_status in ('sellable', 'quarantine', 'damaged', 'reserved_only', 'blocked'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'stock_items_workshop_id_id_key'
      and conrelid = 'public.stock_items'::regclass
  ) then
    alter table public.stock_items
      add constraint stock_items_workshop_id_id_key unique (workshop_id, id);
  end if;
end
$$;

create index if not exists idx_stock_items_public_availability
  on public.stock_items (
    workshop_id,
    source_shop_key,
    canonical_reference,
    quality,
    sellable_status
  )
  where active = true and repair_enabled = true and sellable_status = 'sellable';

-- Engagements qui ne doivent plus être proposés au client. Le stock physique
-- reste distinct afin d'appliquer exactement : physique - réservé - affecté - transfert.
create table public.stock_commitments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  stock_item_id uuid not null,
  source_shop_key text not null,
  commitment_type text not null,
  quantity numeric(12, 2) not null,
  source_id text not null,
  sync_source text not null default 'normalized_sync',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_commitments_stock_item_tenant_fk
    foreign key (tenant_id, stock_item_id)
    references public.stock_items(workshop_id, id) on delete cascade,
  constraint stock_commitments_type_check
    check (commitment_type in ('reservation', 'repair_allocation', 'transfer_out')),
  constraint stock_commitments_quantity_positive check (quantity > 0),
  constraint stock_commitments_source_not_blank check (btrim(source_id) <> ''),
  constraint stock_commitments_unique_source
    unique (tenant_id, stock_item_id, commitment_type, source_id)
);

create index idx_stock_commitments_active_item
  on public.stock_commitments (tenant_id, source_shop_key, stock_item_id, commitment_type)
  where active = true;

alter table public.stock_commitments enable row level security;
revoke all on table public.stock_commitments from anon, authenticated;
create policy "stock_commitments_deny_anon"
  on public.stock_commitments for all to anon using (false) with check (false);
create policy "stock_commitments_deny_authenticated"
  on public.stock_commitments for all to authenticated using (false) with check (false);
grant all on table public.stock_commitments to service_role;

create trigger trg_stock_commitments_touch
  before update on public.stock_commitments
  for each row execute function public.touch_updated_at();

-- Publication explicite par prestation et boutique. Rien n'est publié par
-- défaut ; la quantité exacte nécessite en plus un opt-in séparé.
create table public.widget_stock_publications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  widget_id uuid not null,
  shop_id uuid not null,
  service_public_id text not null,
  canonical_reference text not null,
  quality text,
  source_shop_key text not null default 'shop-default',
  internal_location_filter text,
  publication_mode text not null default 'hidden',
  exact_quantity_enabled boolean not null default false,
  delay_days integer,
  delay_label text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint widget_stock_publications_widget_tenant_fk
    foreign key (tenant_id, widget_id)
    references public.widget_settings(tenant_id, id) on delete cascade,
  constraint widget_stock_publications_shop_tenant_fk
    foreign key (tenant_id, shop_id)
    references public.shops(tenant_id, id) on delete cascade,
  constraint widget_stock_publications_mode_check
    check (publication_mode in ('hidden', 'status', 'delay', 'quantity')),
  constraint widget_stock_publications_exact_quantity_opt_in
    check (publication_mode <> 'quantity' or exact_quantity_enabled = true),
  constraint widget_stock_publications_delay_check
    check (delay_days is null or delay_days between 0 and 365),
  constraint widget_stock_publications_service_not_blank check (btrim(service_public_id) <> ''),
  constraint widget_stock_publications_reference_not_blank check (btrim(canonical_reference) <> ''),
  constraint widget_stock_publications_unique_service_shop
    unique (widget_id, shop_id, service_public_id)
);

create index idx_widget_stock_publications_lookup
  on public.widget_stock_publications (widget_id, shop_id, service_public_id)
  where published = true;

alter table public.widget_stock_publications enable row level security;
revoke all on table public.widget_stock_publications from anon, authenticated;
create policy "widget_stock_publications_deny_anon"
  on public.widget_stock_publications for all to anon using (false) with check (false);
create policy "widget_stock_publications_deny_authenticated"
  on public.widget_stock_publications for all to authenticated using (false) with check (false);
grant all on table public.widget_stock_publications to service_role;

create trigger trg_widget_stock_publications_touch
  before update on public.widget_stock_publications
  for each row execute function public.touch_updated_at();

-- Retourne uniquement le contrat public minimal. Aucun fournisseur, facture,
-- lot, coût, emplacement ou note n'est présent dans le type de retour.
create or replace function public.widget_public_stock_availability(
  p_tenant_id uuid,
  p_widget_id uuid,
  p_shop_id uuid,
  p_service_public_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rule public.widget_stock_publications%rowtype;
  v_physical numeric := 0;
  v_reserved numeric := 0;
  v_allocated numeric := 0;
  v_transfer numeric := 0;
  v_available numeric := 0;
  v_label text;
begin
  select * into v_rule
  from public.widget_stock_publications
  where tenant_id = p_tenant_id
    and widget_id = p_widget_id
    and shop_id = p_shop_id
    and service_public_id = p_service_public_id
    and published = true;

  if not found or v_rule.publication_mode = 'hidden' then
    return jsonb_build_object('mode', 'hidden');
  end if;

  with eligible as (
    select si.id, si.physical_quantity
    from public.stock_items si
    where si.workshop_id = p_tenant_id
      and si.source_shop_key = v_rule.source_shop_key
      and si.canonical_reference = v_rule.canonical_reference
      and lower(btrim(coalesce(si.quality, ''))) = lower(btrim(coalesce(v_rule.quality, '')))
      and (
        v_rule.internal_location_filter is null
        or si.storage_location = v_rule.internal_location_filter
      )
      and si.active = true
      and si.repair_enabled = true
      and si.sellable_status = 'sellable'
  ), commitment_totals as (
    select
      coalesce(sum(sc.quantity) filter (where sc.commitment_type = 'reservation'), 0) as reserved,
      coalesce(sum(sc.quantity) filter (where sc.commitment_type = 'repair_allocation'), 0) as allocated,
      coalesce(sum(sc.quantity) filter (where sc.commitment_type = 'transfer_out'), 0) as transfer_out
    from public.stock_commitments sc
    join eligible e on e.id = sc.stock_item_id
    where sc.tenant_id = p_tenant_id
      and sc.source_shop_key = v_rule.source_shop_key
      and sc.active = true
  )
  select
    coalesce((select sum(e.physical_quantity) from eligible e), 0),
    coalesce(ct.reserved, 0),
    coalesce(ct.allocated, 0),
    coalesce(ct.transfer_out, 0)
  into v_physical, v_reserved, v_allocated, v_transfer
  from commitment_totals ct;

  v_available := greatest(v_physical - v_reserved - v_allocated - v_transfer, 0);

  if v_rule.publication_mode = 'quantity' and v_rule.exact_quantity_enabled then
    return jsonb_build_object(
      'mode', 'quantity',
      'status', case when v_available > 0 then 'available' else 'out' end,
      'quantity', v_available
    );
  end if;

  if v_rule.publication_mode = 'delay' then
    v_label := case
      when v_available > 0 then 'Disponible'
      when nullif(btrim(coalesce(v_rule.delay_label, '')), '') is not null then v_rule.delay_label
      when v_rule.delay_days is not null then 'Disponible sous ' || v_rule.delay_days || ' jour' || case when v_rule.delay_days > 1 then 's' else '' end
      else 'Disponibilité à confirmer'
    end;
    return jsonb_build_object(
      'mode', 'delay',
      'status', case when v_available > 0 then 'available' else 'delay' end,
      'label', v_label
    );
  end if;

  return jsonb_build_object(
    'mode', 'simple',
    'status', case when v_available > 0 then 'available' else 'out' end,
    'label', case when v_available > 0 then 'Disponible' else 'Indisponible' end
  );
end;
$$;

revoke all on function public.widget_public_stock_availability(uuid, uuid, uuid, text) from public;
grant execute on function public.widget_public_stock_availability(uuid, uuid, uuid, text) to service_role;

comment on function public.widget_public_stock_availability(uuid, uuid, uuid, text) is
  'Calcule le stock widget public agrégé par boutique/référence/qualité sans exposer les données internes.';
