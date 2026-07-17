-- Square rejoint l'architecture unique de demandes de paiement externes.
-- Aucune donnée de résultat financier, aucun webhook et aucun historique
-- d'encaissement ne sont ajoutés par cette migration.

alter table public.external_payment_connections
  add column if not exists external_location_id text;

alter table public.external_payment_connections
  drop constraint if exists external_payment_connections_provider_check,
  drop constraint if exists external_payment_connections_mode_check,
  drop constraint if exists external_payment_connections_connection_mode_check,
  drop constraint if exists external_payment_connections_tokens_check;

alter table public.external_payment_connections
  add constraint external_payment_connections_provider_check
    check (provider in ('stripe', 'sumup', 'paypal', 'square')),
  add constraint external_payment_connections_mode_check
    check (
      (provider in ('stripe', 'sumup', 'square') and connection_mode = 'oauth')
      or (provider = 'paypal' and connection_mode in ('manual', 'commerce'))
    ),
  add constraint external_payment_connections_tokens_check
    check (
      provider in ('sumup', 'square')
      or (encrypted_access_token is null and encrypted_refresh_token is null and token_expires_at is null)
    );

alter table public.external_payment_requests
  drop constraint if exists external_payment_requests_provider_check,
  drop constraint if exists external_payment_requests_terminal_provider_check,
  drop constraint if exists external_payment_requests_reader_fk;

alter table public.external_payment_requests
  add constraint external_payment_requests_provider_check
    check (provider in ('stripe', 'sumup', 'paypal', 'square')),
  add constraint external_payment_requests_terminal_provider_check
    check (
      delivery_channel <> 'terminal'
      or (provider in ('sumup', 'square') and reader_id is not null)
    );

alter table public.external_payment_readers
  add column if not exists provider text not null default 'sumup',
  add column if not exists location_id text;

alter table public.external_payment_readers
  drop constraint if exists external_payment_readers_provider_check;

-- Le nom de la contrainte unique historique dépend de la version depuis
-- laquelle la migration est appliquée. Supprimer les anciennes variantes
-- avant d'installer la clé commune fournisseur + terminal.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.external_payment_readers'::regclass
      and contype = 'u'
      and conname <> 'external_payment_readers_tenant_provider_reader_key'
  loop
    execute format(
      'alter table public.external_payment_readers drop constraint %I',
      constraint_name
    );
  end loop;
end;
$$;

alter table public.external_payment_readers
  add constraint external_payment_readers_provider_check
    check (provider in ('sumup', 'square'));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.external_payment_readers'::regclass
      and conname = 'external_payment_readers_tenant_provider_reader_key'
  ) then
    alter table public.external_payment_readers
      add constraint external_payment_readers_tenant_provider_reader_key
      unique (workshop_id, shop_id, provider, reader_id);
  end if;
end;
$$;

alter table public.external_payment_requests
  add constraint external_payment_requests_reader_fk
  foreign key (workshop_id, shop_id, provider, reader_id)
  references public.external_payment_readers(workshop_id, shop_id, provider, reader_id)
  on delete restrict;

alter table public.external_payment_oauth_states
  drop constraint if exists external_payment_oauth_states_provider_check;

alter table public.external_payment_oauth_states
  add constraint external_payment_oauth_states_provider_check
    check (provider in ('stripe', 'sumup', 'paypal', 'square'));

alter table public.external_payment_connections enable row level security;
alter table public.external_payment_connections force row level security;
alter table public.external_payment_requests enable row level security;
alter table public.external_payment_requests force row level security;
alter table public.external_payment_readers enable row level security;
alter table public.external_payment_readers force row level security;
alter table public.external_payment_oauth_states enable row level security;
alter table public.external_payment_oauth_states force row level security;

revoke all on public.external_payment_connections from public, anon, authenticated;
revoke all on public.external_payment_requests from public, anon, authenticated;
revoke all on public.external_payment_readers from public, anon, authenticated;
revoke all on public.external_payment_oauth_states from public, anon, authenticated;

comment on column public.external_payment_connections.external_location_id is
  'Identifiant technique de la location Square du vendeur, sans donnée financière.';
comment on column public.external_payment_readers.provider is
  'Fournisseur technique du terminal externe : SumUp ou Square.';
comment on column public.external_payment_readers.location_id is
  'Location du vendeur associée au terminal Square.';
comment on column public.external_payment_requests.reader_id is
  'Terminal externe ciblé pour la transmission technique, sans résultat financier.';
