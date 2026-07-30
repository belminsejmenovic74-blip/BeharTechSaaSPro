-- Cohérence entre l'immatriculation et la capacité de facturation.
--
-- La migration 20260729231517 a accordé `has_billing = true` en bloc à tous les
-- ateliers existants, sans exiger de SIRET. On rattrape d'abord le numéro déjà
-- saisi dans les réglages applicatifs, puis on pose la contrainte.

-- 1. Rattrapage : le SIRET vit historiquement dans `app_settings.settings`.
update public.workshops as workshop
set siret = nullif(trim(settings.settings ->> 'siret'), '')
from public.app_settings as settings
where settings.workshop_id = workshop.id
  and nullif(trim(workshop.siret), '') is null
  and nullif(trim(settings.settings ->> 'siret'), '') is not null;

-- 2. Normalisation : une chaîne vide n'est pas un SIRET.
update public.workshops
set siret = null
where siret is not null
  and nullif(trim(siret), '') is null;

-- 3. Garde-fou avant contrainte.
--
-- Une contrainte `not valid` serait un piège : PostgreSQL l'applique à toute
-- mise à jour ultérieure, donc un atelier incohérent verrait sa prochaine
-- synchronisation échouer sans rapport apparent avec cette migration. On
-- préfère échouer ici, avec un message actionnable, plutôt que plus tard.
do $$
declare
  offenders int;
begin
  select count(*) into offenders
  from public.workshops
  where has_billing = true
    and siret is null;

  if offenders > 0 then
    raise exception
      'Migration interrompue : % atelier(s) ont has_billing = true sans SIRET. Renseignez leur SIRET depuis /admin/workshops, puis rejouez cette migration.',
      offenders;
  end if;
end
$$;

-- 4. Contrainte validée : plus aucune ligne ne peut affirmer une capacité de
-- facturation sans numéro d'immatriculation.
alter table public.workshops
  add constraint workshops_billing_requires_siret
  check (has_billing = false or siret is not null);

comment on constraint workshops_billing_requires_siret on public.workshops is
  'La capacité de facturation exige un SIRET enregistré. Format vérifié côté applicatif.';
