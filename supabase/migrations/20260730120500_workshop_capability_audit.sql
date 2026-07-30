-- Journal des modifications de capacité effectuées depuis la console super-admin.
--
-- Toute écriture de `siret`, `has_billing` ou du forfait passe par cette table :
-- qui, quand, valeur avant, valeur après.

create table if not exists public.workshop_capability_audit (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  actor text not null,
  field text not null,
  previous_value text,
  next_value text,
  created_at timestamptz not null default now()
);

create index if not exists workshop_capability_audit_workshop_idx
  on public.workshop_capability_audit (workshop_id, created_at desc);

-- Aucune policy : la table n'est lisible et writable que par la service key,
-- donc exclusivement par les server actions de la console admin.
alter table public.workshop_capability_audit enable row level security;

comment on table public.workshop_capability_audit is
  'Journal super-admin des changements de capacité atelier (SIRET, facturation, forfait).';
comment on column public.workshop_capability_audit.actor is
  'Identité de l''opérateur. La console admin partage un secret unique : la valeur vaut donc "super-admin" et ne distingue pas les personnes.';
