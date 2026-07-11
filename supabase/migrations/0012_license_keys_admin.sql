-- ════════════════════════════════════════════════════════════════════════════
--  Migration 0012 — Gestion des Licences Admin & Liens de téléchargement
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Création de la table `license_keys`
create table public.license_keys (
  id uuid primary key default gen_random_uuid(),
  
  -- Sécurité : on ne stocke que le hash de la clé et du token
  key_hash text not null unique,
  key_preview text not null, -- ex: BTP-8K4D-****
  
  download_token_hash text not null unique,
  
  -- Statut et assignation
  status text not null default 'active' check (status in ('active', 'inactive', 'used', 'expired')),
  assigned_customer_name text,
  assigned_customer_email text,
  plan text default 'pro' check (plan in ('free', 'starter', 'pro', 'business')),
  
  -- Limitations (si besoin futur)
  max_devices integer default 3,
  used_devices integer default 0,
  
  -- Tracking des téléchargements
  download_count integer not null default 0,
  last_downloaded_at timestamp with time zone,
  
  -- Dates
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Index pour accélérer les recherches sur les hashs
create index idx_license_keys_key_hash on public.license_keys(key_hash);
create index idx_license_keys_download_token_hash on public.license_keys(download_token_hash);

-- Trigger updated_at
create trigger set_updated_at_license_keys
  before update on public.license_keys
  for each row
  execute function public.touch_updated_at();

-- 2. Sécurité RLS
alter table public.license_keys enable row level security;

-- Pour les téléchargements : on autorise anon à lire via un edge function ou via RLS si token hash match.
-- L'admin aura des droits complets.
-- Pour simplifier et sécuriser, on laisse l'accès public en LECTURE UNIQUEMENT 
-- MAIS on bloque par défaut, tout passera par les requêtes avec la service_role (côté serveur).

-- Par sécurité, on désactive toutes les policies publiques sur cette table.
-- Seul le backend (qui utilise le client Supabase avec le service_role ou un client Next.js Server Actions) 
-- y aura accès pour valider le token et générer les clés.

-- ════════════════════════════════════════════════════════════════════════════
--  Fin migration 0012
-- ════════════════════════════════════════════════════════════════════════════
