-- Migration 0011 — Ajout des variantes vidéos pour le Help Center

alter table public.help_contents add column if not exists video_variants jsonb not null default '[]'::jsonb;
