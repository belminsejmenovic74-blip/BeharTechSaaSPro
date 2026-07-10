-- Étiquettes stock et scan QR sécurisé.
-- Migration non destructive : les SKU/références historiques restent recherchables.

create extension if not exists "pgcrypto";

alter table public.stock_items
  add column if not exists legacy_references text[] not null default '{}'::text[],
  add column if not exists scan_token text,
  add column if not exists scan_active boolean not null default true,
  add column if not exists storage_location text;

-- Référence interne courte pour les pièces historiques qui n'en possèdent pas.
-- Le hash repose sur les UUID déjà aléatoires : la valeur reste stable à chaque réimpression.
update public.stock_items
set internal_code = 'PCE-'
  || substr(upper(md5(workshop_id::text || ':' || id::text)), 1, 4)
  || '-'
  || substr(upper(md5(workshop_id::text || ':' || id::text)), 5, 4)
where nullif(btrim(internal_code), '') is null;

-- Conserver les références fournisseur/canoniques comme alias sans doublon vide.
update public.stock_items
set legacy_references = array(
  select distinct value
  from unnest(
    coalesce(legacy_references, '{}'::text[])
    || array[nullif(btrim(sku), ''), nullif(btrim(canonical_reference), '')]
  ) value
  where value is not null
    and upper(regexp_replace(value, '[^A-Za-z0-9]+', '', 'g'))
      <> upper(regexp_replace(internal_code, '[^A-Za-z0-9]+', '', 'g'))
);

update public.stock_items
set canonical_reference = upper(regexp_replace(internal_code, '[^A-Za-z0-9]+', '', 'g'));

-- Token opaque généré une seule fois. Une réimpression réutilise cette valeur.
update public.stock_items
set scan_token = 'sp_' || upper(encode(gen_random_bytes(18), 'hex'))
where nullif(btrim(scan_token), '') is null;

alter table public.stock_items
  alter column scan_token set not null;

create unique index if not exists stock_items_scan_token_unique_idx
  on public.stock_items (scan_token);

create unique index if not exists stock_items_workshop_short_reference_unique_idx
  on public.stock_items (workshop_id, internal_code)
  where internal_code ~ '^PCE-[A-Z0-9]{4}-[A-Z0-9]{3,4}$';

create index if not exists stock_items_legacy_references_gin_idx
  on public.stock_items using gin (legacy_references);

create index if not exists stock_items_workshop_scan_active_idx
  on public.stock_items (workshop_id, scan_active)
  where scan_active = true;

comment on column public.stock_items.scan_token is
  'Token opaque stable utilisé dans les QR internes ; ne contient aucun identifiant métier ou tenant.';
comment on column public.stock_items.legacy_references is
  'Alias historiques (ancien SKU/référence) conservés pour la recherche manuelle.';
comment on column public.stock_items.storage_location is
  'Emplacement physique facultatif de la pièce dans l’atelier.';

-- RLS reste activée par les migrations précédentes. Aucune politique anon/authenticated
-- n'est ajoutée : le scan demeure protégé par la session/licence atelier côté application.
