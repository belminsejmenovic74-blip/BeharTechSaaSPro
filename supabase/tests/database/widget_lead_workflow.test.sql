begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

select has_table('public', 'widget_lead_history', 'widget lead history table exists');
select has_table('public', 'widget_notifications', 'widget notification table exists');
select has_column('public', 'widget_leads', 'quote_id', 'lead can link to an existing quote');
select has_column('public', 'widget_leads', 'submission_payload', 'complete sanitized submission is retained');
select has_column('public', 'widget_leads', 'conversion_reference', 'local conversion reference is retained');
select has_column('public', 'widget_leads', 'last_activity_at', 'lead last activity is tracked');
select has_column('public', 'widget_leads', 'closed_at', 'lead closure date is tracked');
select has_column('public', 'widget_leads', 'spam_at', 'spam classification date is tracked');

select ok(
  (
    select bool_and(c.relrowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('widget_lead_history', 'widget_notifications')
  ),
  'RLS is enabled on lead workflow tables'
);

select ok(
  not has_table_privilege('anon', 'public.widget_lead_history', 'select'),
  'anon cannot read lead history'
);

select ok(
  not has_table_privilege('authenticated', 'public.widget_notifications', 'select'),
  'authenticated clients cannot read widget notifications'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.widget_leads'::regclass
      and tgname = 'trg_widget_lead_workflow_insert'
      and not tgisinternal
  ),
  'lead insertion notification trigger exists'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.widget_leads'::regclass
      and tgname = 'trg_widget_lead_workflow_update'
      and not tgisinternal
  ),
  'lead status and assignment history trigger exists'
);

select has_index(
  'public',
  'widget_lead_history',
  'idx_widget_lead_history_lead_created',
  'lead history lookup index exists'
);

select * from finish();

rollback;
