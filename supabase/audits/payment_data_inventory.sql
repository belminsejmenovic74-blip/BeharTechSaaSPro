-- Lecture seule. À exécuter manuellement avant toute purge, avec un rôle autorisé.
-- Le résultat agrège les volumes ; il ne sélectionne ni noms de clients ni secrets.

select workshop_id, count(*) as legacy_payment_rows, min(created_at) as first_row_at, max(created_at) as last_row_at
from public.payments
group by workshop_id
order by workshop_id;

select workshop_id, payment_status, count(*) as legacy_sales_rows
from public.sales
group by workshop_id, payment_status
order by workshop_id, payment_status;

select workshop_id, document_type, count(*) as legacy_document_rows
from public.documents
where payment_id is not null
   or document_type in ('payment', 'payment_confirmation', 'payment_receipt', 'sale_receipt')
group by workshop_id, document_type
order by workshop_id, document_type;

select workshop_id, count(*) as snapshots_with_legacy_payment_keys
from public.workshop_snapshots
where state ?| array[
  'payments', 'paymentStatus', 'amountPaid', 'paidAmount', 'paidAt',
  'paymentMethod', 'remainingAmount', 'cashReceived'
]
group by workshop_id
order by workshop_id;

select workshop_id,
  count(*) filter (
    where jsonb_typeof(state->'payments') = 'array' and jsonb_array_length(state->'payments') > 0
  ) as snapshots_with_non_empty_payments,
  coalesce(sum(
    case when jsonb_typeof(state->'payments') = 'array' then jsonb_array_length(state->'payments') else 0 end
  ), 0) as legacy_payment_objects
from public.workshop_snapshots
where state ? 'payments'
group by workshop_id
order by workshop_id;

select workshop_id, status, count(*) as legacy_invoice_status_rows
from public.invoices
where lower(status) in ('paid', 'partially_paid', 'unpaid', 'refunded')
group by workshop_id, status
order by workshop_id, status;

select workshop_id,
  count(*) filter (where requested_amount is not null) as requests_with_amount,
  count(*) filter (where currency is not null) as requests_with_currency,
  count(*) filter (where delivery_channel is not null) as requests_with_channel,
  count(*) filter (where technical_state is not null) as requests_with_technical_state,
  count(*) filter (where sent_at is not null) as requests_with_sent_at,
  count(*) filter (where reader_id is not null) as requests_with_reader_id,
  count(*) filter (where repair_id is not null) as requests_with_repair_id,
  count(*) filter (where created_by is not null) as requests_with_created_by
from public.external_payment_requests
group by workshop_id
order by workshop_id;
