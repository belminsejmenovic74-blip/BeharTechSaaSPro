-- Tags « hors catalogue » sur les demandes du widget. Strictement additif :
-- aucune donnée existante n'est modifiée, colonne à défaut vide.
--
-- Exemples de tags : modèle_non_configuré, panne_non_configurée,
-- demande_hors_catalogue, devis_manuel_à_traiter. Ils permettent au réparateur
-- de repérer et traiter les demandes qui sortent de sa configuration.

alter table public.widget_leads
  add column if not exists tags text[] not null default '{}'::text[];

create index if not exists idx_widget_leads_tags
  on public.widget_leads using gin (tags)
  where cardinality(tags) > 0;

comment on column public.widget_leads.tags is
  'Tags hors catalogue posés par le widget (modèle/panne non configurés, demande hors catalogue).';
