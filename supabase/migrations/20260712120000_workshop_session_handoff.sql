-- Pont de session behartechpro.fr (Svelte / auth Supabase) → app.behartechpro.fr
-- (SaaS / licence). Un CODE à usage unique et courte durée est créé pour un
-- utilisateur authentifié puis échangé (une seule fois) par le SaaS contre la
-- clé de licence de l'atelier. Aucun token Supabase ne transite dans l'URL.
--
-- Sécurité : accès table refusé au public ; seules les fonctions SECURITY
-- DEFINER ci-dessous manipulent les codes. Le code est un nonce imprévisible,
-- consommé et expiré immédiatement après usage.

-- 1) Mapping compte → licence.
--    L'AUTOMATISATION (autre IA) alimente cette table à l'inscription :
--    une ligne (user_id → license_key) par atelier provisionné.
create table if not exists public.workshop_owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  license_key text not null,
  created_at timestamptz not null default now()
);

alter table public.workshop_owners enable row level security;

drop policy if exists "workshop_owners_select_own" on public.workshop_owners;
create policy "workshop_owners_select_own"
  on public.workshop_owners
  for select
  to authenticated
  using (user_id = auth.uid());

-- 2) Codes de transfert à usage unique.
create table if not exists public.workshop_session_handoffs (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  license_key text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 minutes',
  redeemed_at timestamptz
);

alter table public.workshop_session_handoffs enable row level security;
-- Aucun accès direct : tout passe par les fonctions SECURITY DEFINER.
revoke all on public.workshop_session_handoffs from anon, authenticated;

-- 3) Création du code — appelée par le site public (utilisateur authentifié).
create or replace function public.create_workshop_handoff()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_license text;
begin
  if auth.uid() is null then
    return null;
  end if;

  select license_key
    into v_license
    from public.workshop_owners
   where user_id = auth.uid()
   limit 1;

  -- Pas encore de licence provisionnée pour ce compte : on ne fabrique pas de
  -- code, le SaaS demandera la clé (comportement actuel).
  if v_license is null then
    return null;
  end if;

  v_code := encode(extensions.gen_random_bytes(24), 'hex');

  insert into public.workshop_session_handoffs (code, user_id, license_key)
  values (v_code, auth.uid(), v_license);

  return v_code;
end;
$$;

grant execute on function public.create_workshop_handoff() to authenticated;

-- 4) Échange du code — appelée par le SaaS (client anonyme ; le code fait foi).
create or replace function public.redeem_workshop_handoff(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_license text;
begin
  update public.workshop_session_handoffs
     set redeemed_at = now()
   where code = p_code
     and redeemed_at is null
     and expires_at > now()
  returning license_key into v_license;

  -- null si code invalide / expiré / déjà consommé.
  return v_license;
end;
$$;

grant execute on function public.redeem_workshop_handoff(text) to anon, authenticated;
