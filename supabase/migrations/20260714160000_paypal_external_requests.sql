-- PayPal rejoint l'architecture de demandes externes Stripe/SumUp.
-- Cette migration n'ajoute aucun résultat financier, webhook ou historique.

alter table public.external_payment_connections
  add column if not exists connection_mode text not null default 'oauth',
  add column if not exists encrypted_configuration text;

alter table public.external_payment_connections
  drop constraint if exists external_payment_connections_provider_check,
  drop constraint if exists external_payment_connections_mode_check,
  drop constraint if exists external_payment_connections_configuration_check;

alter table public.external_payment_connections
  add constraint external_payment_connections_provider_check
    check (provider in ('stripe', 'sumup', 'paypal')),
  add constraint external_payment_connections_mode_check
    check (
      (provider in ('stripe', 'sumup') and connection_mode = 'oauth')
      or (provider = 'paypal' and connection_mode in ('manual', 'commerce'))
    ),
  add constraint external_payment_connections_configuration_check
    check (
      (provider = 'paypal' and connection_mode = 'manual' and (encrypted_configuration is not null or disconnected_at is not null))
      or (not (provider = 'paypal' and connection_mode = 'manual') and encrypted_configuration is null)
    );

alter table public.external_payment_requests
  drop constraint if exists external_payment_requests_provider_check;

alter table public.external_payment_requests
  add constraint external_payment_requests_provider_check
    check (provider in ('stripe', 'sumup', 'paypal'));

alter table public.external_payment_oauth_states
  drop constraint if exists external_payment_oauth_states_provider_check;

alter table public.external_payment_oauth_states
  add constraint external_payment_oauth_states_provider_check
    check (provider in ('stripe', 'sumup', 'paypal'));

-- Les mêmes protections multi-tenant restent actives. Ces commandes rendent
-- la migration sûre même si le projet a modifié ses réglages Data API.
alter table public.external_payment_connections enable row level security;
alter table public.external_payment_connections force row level security;
alter table public.external_payment_requests enable row level security;
alter table public.external_payment_requests force row level security;
alter table public.external_payment_oauth_states enable row level security;
alter table public.external_payment_oauth_states force row level security;

revoke all on public.external_payment_connections from public, anon, authenticated;
revoke all on public.external_payment_requests from public, anon, authenticated;
revoke all on public.external_payment_oauth_states from public, anon, authenticated;

comment on column public.external_payment_connections.connection_mode is
  'Mode technique oauth, lien PayPal manuel ou PayPal Commerce Platform.';
comment on column public.external_payment_connections.encrypted_configuration is
  'Configuration externe chiffrée côté serveur, jamais exposée sans autorisation boutique.';
