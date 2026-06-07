-- Align normalized Supabase tables with the Behar Tech Pro counter/atelier workflow.
-- Existing rows keep working; new columns default conservatively so repair parts
-- do not appear in counter sale unless explicitly enabled by the app.

alter table public.repairs drop constraint if exists repairs_status_check;
alter table public.repairs
  add constraint repairs_status_check
  check (
    status in (
      'received',
      'diagnosis',
      'waiting',
      'quote_sent',
      'quote_accepted',
      'repair',
      'final_test',
      'ready',
      'delivered',
      'cancelled',
      'irreparable',
      'sav'
    )
  );

alter table public.stock_items
  add column if not exists item_type text not null default 'part',
  add column if not exists repair_enabled boolean not null default true,
  add column if not exists counter_sale_enabled boolean not null default false,
  add column if not exists active boolean not null default true;

update public.stock_items
set
  item_type = case
    when lower(coalesce(category, '')) like '%accessoire%' then 'accessory'
    when lower(coalesce(category, '')) like '%produit%' then 'product'
    else coalesce(nullif(item_type, ''), 'part')
  end,
  repair_enabled = case
    when lower(coalesce(category, '')) like '%accessoire%' then false
    when lower(coalesce(category, '')) like '%produit%' then false
    else repair_enabled
  end,
  counter_sale_enabled = case
    when lower(coalesce(category, '')) like '%accessoire%' then true
    when lower(coalesce(category, '')) like '%produit%' then true
    else counter_sale_enabled
  end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stock_items_item_type_check'
      and conrelid = 'public.stock_items'::regclass
  ) then
    alter table public.stock_items
      add constraint stock_items_item_type_check
      check (item_type in ('part', 'accessory', 'product'));
  end if;
end $$;

create index if not exists idx_stock_items_counter_sale
  on public.stock_items(workshop_id, active, counter_sale_enabled, item_type)
  where active = true and counter_sale_enabled = true;

create index if not exists idx_repairs_status_workshop
  on public.repairs(workshop_id, status);
