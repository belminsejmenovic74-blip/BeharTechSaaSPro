-- Mollie Connect rejoint l'architecture unique des demandes externes.
-- Les OAuth tokens appartiennent à chaque organisation Mollie connectée et
-- aucun résultat de paiement, webhook, remboursement ou règlement n'est ajouté.

alter table public.external_payment_connections
  drop constraint if exists external_payment_connections_provider_check,
  drop constraint if exists external_payment_connections_mode_check,
  drop constraint if exists external_payment_connections_connection_mode_check,
  drop constraint if exists external_payment_connections_tokens_check;

alter table public.external_payment_connections
  add constraint external_payment_connections_provider_check
    check (provider in ('stripe', 'sumup', 'paypal', 'square', 'revolut', 'mollie')),
  add constraint external_payment_connections_mode_check
    check (
      (provider in ('stripe', 'sumup', 'square', 'mollie') and connection_mode = 'oauth')
      or (provider = 'paypal' and connection_mode in ('manual', 'commerce'))
      or (provider = 'revolut' and connection_mode = 'api_key')
    ),
  add constraint external_payment_connections_tokens_check
    check (
      provider in ('sumup', 'square')
      or (
        provider = 'mollie'
        and (
          (
            disconnected_at is null
            and encrypted_access_token is not null
            and encrypted_refresh_token is not null
            and token_expires_at is not null
          )
          or (
            disconnected_at is not null
            and encrypted_access_token is null
            and encrypted_refresh_token is null
            and token_expires_at is null
          )
        )
      )
      or (
        provider = 'revolut'
        and (
          (
            disconnected_at is null
            and encrypted_access_token is not null
            and encrypted_refresh_token is null
            and token_expires_at is null
          )
          or (
            disconnected_at is not null
            and encrypted_access_token is null
            and encrypted_refresh_token is null
            and token_expires_at is null
          )
        )
      )
      or (
        provider not in ('sumup', 'square', 'revolut', 'mollie')
        and encrypted_access_token is null
        and encrypted_refresh_token is null
        and token_expires_at is null
      )
    );

alter table public.external_payment_requests
  drop constraint if exists external_payment_requests_provider_check;

alter table public.external_payment_requests
  add constraint external_payment_requests_provider_check
    check (provider in ('stripe', 'sumup', 'paypal', 'square', 'revolut', 'mollie'));

alter table public.external_payment_oauth_states
  drop constraint if exists external_payment_oauth_states_provider_check;

alter table public.external_payment_oauth_states
  add constraint external_payment_oauth_states_provider_check
    check (provider in ('stripe', 'sumup', 'paypal', 'square', 'mollie'));

alter table public.external_payment_connections enable row level security;
alter table public.external_payment_connections force row level security;
alter table public.external_payment_requests enable row level security;
alter table public.external_payment_requests force row level security;
alter table public.external_payment_oauth_states enable row level security;
alter table public.external_payment_oauth_states force row level security;

revoke all on public.external_payment_connections from public, anon, authenticated;
revoke all on public.external_payment_requests from public, anon, authenticated;
revoke all on public.external_payment_oauth_states from public, anon, authenticated;

comment on column public.external_payment_connections.external_account_id is
  'Identifiant technique du compte externe : organization ID Mollie pour Mollie Connect.';
comment on column public.external_payment_connections.external_location_id is
  'Identifiant technique de location ou de profil : profile ID Mollie pour Mollie Connect.';
comment on table public.external_payment_requests is
  'Demandes techniques externes uniquement, sans statut, méthode, carte, règlement ou synchronisation financière.';
