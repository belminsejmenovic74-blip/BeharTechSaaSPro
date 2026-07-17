-- Revolut Business rejoint l'architecture unique des demandes externes.
-- La clé Merchant API appartient au réparateur et est chiffrée côté serveur.
-- Aucun résultat financier, payment attempt, webhook ou historique n'est ajouté.

alter table public.external_payment_connections
  drop constraint if exists external_payment_connections_provider_check,
  drop constraint if exists external_payment_connections_mode_check,
  drop constraint if exists external_payment_connections_connection_mode_check,
  drop constraint if exists external_payment_connections_tokens_check;

alter table public.external_payment_connections
  add constraint external_payment_connections_provider_check
    check (provider in ('stripe', 'sumup', 'paypal', 'square', 'revolut')),
  add constraint external_payment_connections_mode_check
    check (
      (provider in ('stripe', 'sumup', 'square') and connection_mode = 'oauth')
      or (provider = 'paypal' and connection_mode in ('manual', 'commerce'))
      or (provider = 'revolut' and connection_mode = 'api_key')
    ),
  add constraint external_payment_connections_tokens_check
    check (
      provider in ('sumup', 'square')
      or (
        provider = 'revolut'
        and encrypted_access_token is not null
        and encrypted_refresh_token is null
        and token_expires_at is null
      )
      or (
        provider not in ('sumup', 'square', 'revolut')
        and encrypted_access_token is null
        and encrypted_refresh_token is null
        and token_expires_at is null
      )
    );

alter table public.external_payment_requests
  drop constraint if exists external_payment_requests_provider_check,
  drop constraint if exists external_payment_requests_terminal_provider_check,
  drop constraint if exists external_payment_requests_reader_fk;

alter table public.external_payment_requests
  add constraint external_payment_requests_provider_check
    check (provider in ('stripe', 'sumup', 'paypal', 'square', 'revolut')),
  add constraint external_payment_requests_terminal_provider_check
    check (
      delivery_channel <> 'terminal'
      or (provider in ('sumup', 'square', 'revolut') and reader_id is not null)
    );

alter table public.external_payment_readers
  drop constraint if exists external_payment_readers_provider_check;

alter table public.external_payment_readers
  add constraint external_payment_readers_provider_check
    check (provider in ('sumup', 'square', 'revolut'));

alter table public.external_payment_requests
  add constraint external_payment_requests_reader_fk
  foreign key (workshop_id, shop_id, provider, reader_id)
  references public.external_payment_readers(workshop_id, shop_id, provider, reader_id)
  on delete restrict;

alter table public.external_payment_connections enable row level security;
alter table public.external_payment_connections force row level security;
alter table public.external_payment_requests enable row level security;
alter table public.external_payment_requests force row level security;
alter table public.external_payment_readers enable row level security;
alter table public.external_payment_readers force row level security;

revoke all on public.external_payment_connections from public, anon, authenticated;
revoke all on public.external_payment_requests from public, anon, authenticated;
revoke all on public.external_payment_readers from public, anon, authenticated;

comment on column public.external_payment_connections.encrypted_access_token is
  'Jeton OAuth chiffré ou clé Merchant API Revolut chiffrée, jamais exposée au navigateur.';
comment on table public.external_payment_requests is
  'Demandes techniques externes uniquement, sans résultat financier ni synchronisation d encaissement.';
