-- Evolution additive de l'integration de demandes externes existante.
-- Aucun resultat financier SumUp n'est ajoute ou synchronise.

alter table public.external_payment_readers
  add column if not exists active boolean not null default true;

alter table public.external_payment_requests
  add column if not exists reader_id text;

alter table public.external_payment_requests
  alter column technical_state drop default;

update public.external_payment_requests
set technical_state = case technical_state
  when 'link_created' then 'created'
  when 'request_transmitted' then 'sent'
  when 'transmission_error' then 'dispatch_error'
  else technical_state
end
where technical_state in ('link_created', 'request_transmitted', 'transmission_error');

alter table public.external_payment_requests
  drop constraint if exists external_payment_requests_technical_state_check;

alter table public.external_payment_requests
  add constraint external_payment_requests_technical_state_check
  check (technical_state in ('created', 'sent', 'dispatch_error'));

alter table public.external_payment_requests
  alter column technical_state set default 'created';

alter table public.external_payment_requests
  drop constraint if exists external_payment_requests_terminal_provider_check;

alter table public.external_payment_requests
  add constraint external_payment_requests_terminal_provider_check
  check (delivery_channel <> 'terminal' or (provider = 'sumup' and reader_id is not null));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'external_payment_requests_reader_fk'
      and conrelid = 'public.external_payment_requests'::regclass
  ) then
    alter table public.external_payment_requests
      add constraint external_payment_requests_reader_fk
      foreign key (workshop_id, shop_id, reader_id)
      references public.external_payment_readers(workshop_id, shop_id, reader_id)
      on delete restrict;
  end if;
end;
$$;

comment on column public.external_payment_requests.reader_id is
  'Lecteur technique cible pour une transmission SumUp Solo, sans resultat de paiement.';
