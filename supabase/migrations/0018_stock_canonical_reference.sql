-- Migration 0018 — Référence pièce canonique pour recherche/scan
-- Non destructive : ajoute une clé de recherche normalisée sans imposer d'unicité sur les historiques.

alter table public.stock_items
  add column if not exists canonical_reference text;

alter table public.purchases
  add column if not exists canonical_reference text;

alter table public.supplier_invoice_lines
  add column if not exists canonical_reference text;

alter table public.stock_movements
  add column if not exists canonical_reference text;

update public.stock_items
set canonical_reference = upper(regexp_replace(coalesce(nullif(sku, ''), nullif(internal_code, ''), id::text), '[^A-Za-z0-9]+', '-', 'g'))
where canonical_reference is null;

update public.purchases
set canonical_reference = upper(regexp_replace(coalesce(nullif(reference, ''), nullif(internal_code, ''), id::text), '[^A-Za-z0-9]+', '-', 'g'))
where canonical_reference is null;

update public.supplier_invoice_lines
set canonical_reference = upper(regexp_replace(coalesce(nullif(sku, ''), nullif(reference, ''), nullif(internal_code, ''), id::text), '[^A-Za-z0-9]+', '-', 'g'))
where canonical_reference is null;

update public.stock_movements
set canonical_reference = upper(regexp_replace(coalesce(nullif(part_reference, ''), nullif(internal_code, ''), stock_item_id), '[^A-Za-z0-9]+', '-', 'g'))
where canonical_reference is null;

create index if not exists stock_items_canonical_reference_idx
  on public.stock_items (workshop_id, canonical_reference);

create index if not exists purchases_canonical_reference_idx
  on public.purchases (workshop_id, canonical_reference);

create index if not exists supplier_invoice_lines_canonical_reference_idx
  on public.supplier_invoice_lines (workshop_id, canonical_reference);

create index if not exists stock_movements_canonical_reference_idx
  on public.stock_movements (organization_id, canonical_reference, created_at desc);
