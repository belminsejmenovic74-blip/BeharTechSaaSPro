-- ─────────────────────────────────────────────────────────────────────────────
--  Certificats publics de reconditionnement — table + accès anonyme (QR public)
-- ─────────────────────────────────────────────────────────────────────────────
--  La page /suivi/appareil/:token (QR du certificat de vente reconditionné) lit
--  cette table ; l'atelier l'écrit directement avec la clé `anon` du navigateur
--  (cf. src/lib/reconditioning-public-sync.ts → syncPublicReconditioningCertificate).
--
--  Constat prod : la table de la migration 0016 n'était pas déployée
--  (PGRST205 « Could not find the table public.reconditioning_public_certificates »),
--  donc l'écriture du certificat échouait en silence et le scan du QR tombait sur
--  « Certificat introuvable ». Cette migration (re)crée la table si besoin et
--  ouvre les policies RLS anonymes, sur le même modèle que public_tracking_repairs
--  (migration 0013). Idempotente : rejouable sans risque.
--
--  `display_payload` est un DTO déjà filtré (aucune donnée client personnelle,
--  IMEI masqué). Voir buildPublicReconditioningDisplayPayload.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.reconditioning_public_certificates (
  id              uuid primary key default gen_random_uuid(),
  device_id       text not null,
  public_token    text not null unique,
  workshop_id     text,
  display_payload jsonb not null default '{}'::jsonb,
  status          text,
  sold_at         timestamptz,
  sale_id         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists reconditioning_public_certificates_device_idx
  on public.reconditioning_public_certificates (device_id);

alter table public.reconditioning_public_certificates enable row level security;

-- ── Lecture anonyme : la page publique du certificat (fallback direct + secours
--    si l'API service-role n'est pas disponible sur le déploiement) ─────────────
drop policy if exists "recond_certificates_anon_select" on public.reconditioning_public_certificates;
create policy "recond_certificates_anon_select"
  on public.reconditioning_public_certificates
  for select
  to anon, authenticated
  using (true);

-- ── Écriture anonyme : la synchro atelier écrit directement depuis le client anon.
drop policy if exists "recond_certificates_anon_insert" on public.reconditioning_public_certificates;
create policy "recond_certificates_anon_insert"
  on public.reconditioning_public_certificates
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "recond_certificates_anon_update" on public.reconditioning_public_certificates;
create policy "recond_certificates_anon_update"
  on public.reconditioning_public_certificates
  for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.reconditioning_public_certificates to anon, authenticated;
