-- PROPOSITION DESTRUCTIVE — NE PAS AJOUTER AUX MIGRATIONS SANS VALIDATION ÉCRITE.
-- 1. Exécuter ../audits/payment_data_inventory.sql et archiver uniquement les comptes agrégés.
-- 2. Faire valider la durée de conservation et le plan de reprise par le conseil juridique/comptable.
-- 3. Obtenir une sauvegarde restaurable et une validation explicite du propriétaire des données.
-- 4. Supprimer le garde-fou ci-dessous uniquement dans une migration nouvellement générée et revue.

begin;

do $$
begin
  raise exception 'EXPLICIT_APPROVAL_REQUIRED_DO_NOT_RUN';
end;
$$;

-- Nettoyage récursif des clés de résultat de paiement dans les snapshots.
-- Cette fonction n'est créée qu'à l'intérieur de la transaction approuvée.
create or replace function pg_temp.strip_legacy_payment_keys(value jsonb)
returns jsonb
language sql
immutable
as $$
  select case jsonb_typeof(value)
    when 'object' then coalesce((
      select jsonb_object_agg(key, pg_temp.strip_legacy_payment_keys(child))
      from jsonb_each(value) as entry(key, child)
      where key not in (
        'payments', 'payment', 'paymentId', 'paymentIds', 'paymentStatus', 'paymentMethod',
        'paymentMethodNote', 'paymentCustomMethod', 'paymentAmount', 'paymentPaidAt',
        'paymentReference', 'paymentRecordedBy', 'paymentRecordedOutsideBeharTechPro',
        'paymentNote', 'amountPaid', 'paidAmount', 'paidAt', 'remainingAmount',
        'cashReceived', 'cashRegister', 'transactions', 'refunds', 'settlements'
      )
    ), '{}'::jsonb)
    when 'array' then coalesce((
      select jsonb_agg(pg_temp.strip_legacy_payment_keys(child))
      from jsonb_array_elements(value) as entry(child)
    ), '[]'::jsonb)
    else value
  end;
$$;

update public.workshop_snapshots
set state = pg_temp.strip_legacy_payment_keys(state)
where state ?| array[
  'payments', 'paymentStatus', 'amountPaid', 'paidAmount', 'paidAt',
  'paymentMethod', 'remainingAmount', 'cashReceived'
];

-- Neutralisation des anciens statuts de résultat dans les factures embarquées.
update public.workshop_snapshots as snapshot
set state = jsonb_set(
  snapshot.state,
  '{invoices}',
  coalesce((
    select jsonb_agg(
      case
        when lower(coalesce(invoice->>'status', '')) in ('paid', 'partially_paid', 'unpaid', 'refunded', 'payée')
          then jsonb_set(invoice, '{status}', '"Envoyée"'::jsonb)
        else invoice
      end
    )
    from jsonb_array_elements(snapshot.state->'invoices') as entries(invoice)
  ), '[]'::jsonb)
)
where jsonb_typeof(snapshot.state->'invoices') = 'array';

delete from public.documents
where payment_id is not null
   or document_type in ('payment', 'payment_confirmation', 'payment_receipt', 'sale_receipt');

drop trigger if exists reject_legacy_payment_document on public.documents;
alter table public.documents drop column if exists payment_id;

drop trigger if exists reject_legacy_sales_payment_state on public.sales;
alter table public.sales drop column if exists payment_status;

drop trigger if exists reject_legacy_payment_write on public.payments;
drop table if exists public.payments;

drop trigger if exists validate_minimal_external_payment_request_trigger on public.external_payment_requests;
alter table public.external_payment_requests
  drop column if exists requested_amount,
  drop column if exists currency,
  drop column if exists delivery_channel,
  drop column if exists technical_state,
  drop column if exists sent_at,
  drop column if exists reader_id,
  drop column if exists repair_id,
  drop column if exists created_by;

commit;
