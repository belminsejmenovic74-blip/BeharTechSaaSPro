-- ─────────────────────────────────────────────────────────────────────────────
--  Suivi public des DOCUMENTS COMMERCIAUX — devis / facture / reçu / vente
-- ─────────────────────────────────────────────────────────────────────────────
--  Mêmes principes que 0013 (public_tracking_repairs) : les pages publiques
--  /devis /facture /recu /vente sont accessibles SANS connexion et lisent
--  directement cette table avec la clé `anon` (cf. src/lib/supabase/client.ts).
--
--  Cette table remplace l'ancien chemin serveur (`/api/public/*` → tables
--  normalisées sales/quotes/invoices/payments qui N'EXISTENT PAS dans ce projet
--  Supabase, et clé service-role absente sur Vercel). Le client pousse ici un
--  DTO déjà filtré (PublicCommercialDocumentDto, cf. src/lib/public-dtos.ts) :
--  il n'expose que le nom d'affichage du client + les coordonnées de la BOUTIQUE.
--
--  `token` = identifiant de l'entité (quote.id / invoice.id / payment.id / sale.id).
--  Migration idempotente : rejouable sans risque.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.public_tracking_documents (
  token           text primary key,
  kind            text not null,           -- 'quote' | 'invoice' | 'receipt' | 'sale'
  workshop_id     text,
  shop_slug       text,
  document_number text,
  status          text,
  public_data     jsonb not null,
  updated_at      timestamptz not null default now()
);

create index if not exists idx_public_tracking_documents_kind
  on public.public_tracking_documents (kind);

alter table public.public_tracking_documents enable row level security;

-- ── Lecture anonyme : indispensable pour les pages publiques /devis /facture … ──
drop policy if exists "public_tracking_docs_anon_select" on public.public_tracking_documents;
create policy "public_tracking_docs_anon_select"
  on public.public_tracking_documents
  for select
  to anon, authenticated
  using (true);

-- ── Écriture anonyme : la synchro cloud (syncPublicTrackingDocumentsToCloud)
--    écrit directement depuis le client anon, comme pour les réparations. ────────
drop policy if exists "public_tracking_docs_anon_insert" on public.public_tracking_documents;
create policy "public_tracking_docs_anon_insert"
  on public.public_tracking_documents
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "public_tracking_docs_anon_update" on public.public_tracking_documents;
create policy "public_tracking_docs_anon_update"
  on public.public_tracking_documents
  for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.public_tracking_documents to anon, authenticated;
