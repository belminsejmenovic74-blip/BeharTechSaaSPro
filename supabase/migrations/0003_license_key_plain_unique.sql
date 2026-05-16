-- ════════════════════════════════════════════════════════════════════════════
--  Migration 0003 — Contrainte UNIQUE simple sur license_key
-- ════════════════════════════════════════════════════════════════════════════
--
--  La migration 0002 avait posé un index unique sur `upper(license_key)`.
--  Problème : ON CONFLICT (license_key) ne matche pas un index sur une
--  expression — Postgres répond :
--    « there is no unique or exclusion constraint matching the ON CONFLICT
--      specification ».
--
--  Le client normalise déjà la licence en uppercase avant tout upload/
--  download, donc une contrainte UNIQUE simple sur license_key suffit, et
--  rend ON CONFLICT (license_key) à nouveau utilisable côté client si besoin.
--
--  Le code applicatif n'a PAS besoin de cette migration pour fonctionner
--  (la stratégie SELECT-then-UPDATE/INSERT marche déjà), mais elle ferme
--  définitivement la porte aux doublons en cas d'inserts concurrents.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Dédoublonnage défensif : si jamais deux lignes existent pour la même
--    licence (cas d'inserts concurrents pendant la fenêtre buggée), on garde
--    la plus récente.
with ranked as (
  select id,
         row_number() over (
           partition by license_key
           order by updated_at desc nulls last, created_at desc nulls last
         ) as rn
    from public.workshop_snapshots
   where license_key is not null
)
delete from public.workshop_snapshots ws
 using ranked
 where ws.id = ranked.id
   and ranked.rn > 1;

-- 2. Contrainte UNIQUE directe sur la colonne license_key
--    (autorise ON CONFLICT (license_key) côté client).
alter table public.workshop_snapshots
  drop constraint if exists workshop_snapshots_license_key_key;

alter table public.workshop_snapshots
  add constraint workshop_snapshots_license_key_key unique (license_key);

-- L'ancien index sur upper(license_key) devient redondant — on le supprime.
drop index if exists public.idx_workshop_snapshots_license_key_unique;

-- ════════════════════════════════════════════════════════════════════════════
--  Fin migration 0003
-- ════════════════════════════════════════════════════════════════════════════
