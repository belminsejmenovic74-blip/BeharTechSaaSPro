-- Rollback de 20260730120000_workshop_billing_requires_siret.sql.
--
-- Seule la contrainte est retirée. Le rattrapage des SIRET (étapes 1 et 2) est
-- délibérément conservé : ces numéros étaient déjà saisis par les ateliers, les
-- effacer serait une perte de données sans contrepartie.

alter table public.workshops
  drop constraint if exists workshops_billing_requires_siret;
