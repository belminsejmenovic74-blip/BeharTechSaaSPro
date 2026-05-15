-- ════════════════════════════════════════════════════════════════════════════
--  Migration 0002 — La licence devient l'identifiant unique (Netflix-style)
-- ════════════════════════════════════════════════════════════════════════════
--
--  Concept : `license_key` = login. Une licence = un atelier = un seul jeu de
--  données dans Supabase. Plus besoin de recovery_code.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. license_key devient NOT NULL et UNIQUE
alter table public.workshop_snapshots
  alter column license_key set not null;

-- Drop l'ancienne contrainte d'unicité sur workshop_id si elle existe en doublon
-- (workshop_id reste, mais c'est désormais license_key qui sert de clé fonctionnelle)

create unique index if not exists idx_workshop_snapshots_license_key_unique
  on public.workshop_snapshots ((upper(license_key)));

-- 2. recovery_code devient nullable (pas obligatoire en mode auto-sync)
alter table public.workshop_snapshots
  alter column recovery_code drop not null;

-- 3. Politiques RLS — déjà ouvertes à anon, on garde
--    (la sécurité repose sur la licence comme secret partagé)

-- ════════════════════════════════════════════════════════════════════════════
--  Fin migration 0002
-- ════════════════════════════════════════════════════════════════════════════
