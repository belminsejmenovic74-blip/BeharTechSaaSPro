-- Rollback de 20260730120500_workshop_capability_audit.sql.
-- Supprime le journal d'audit et son index.

drop table if exists public.workshop_capability_audit;
