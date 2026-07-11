begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

select has_table('public', 'shops', 'shops table exists');
select has_table('public', 'widget_settings', 'widget_settings table exists');
select has_table('public', 'widget_versions', 'widget_versions table exists');
select has_table('public', 'widget_leads', 'widget_leads table exists');
select has_table('public', 'widget_events', 'widget_events table exists');
select has_table('public', 'widget_rate_limits', 'widget rate-limit table exists');

select has_column('public', 'widget_settings', 'public_widget_id', 'widget has a stable public identifier');
select has_column('public', 'widget_settings', 'published_config', 'widget has a published configuration');
select has_column('public', 'widget_leads', 'phone_normalized', 'lead phone normalization is persisted');
select has_column('public', 'widget_leads', 'appointment_id', 'lead reuses appointments');
select has_column('public', 'widget_events', 'event_name', 'analytics event name is persisted');
select has_column('public', 'clients', 'phone_normalized', 'existing clients support normalized lookup');
select has_column('public', 'appointments', 'widget_id', 'existing appointments are linked to widgets');
select has_column('public', 'appointments', 'widget_lead_id', 'existing appointments are linked to leads');

select ok(
  (
    select bool_and(c.relrowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('shops', 'widget_settings', 'widget_versions', 'widget_leads', 'widget_events')
  ),
  'RLS is enabled on every new exposed table'
);

select ok(
  not has_table_privilege('anon', 'public.widget_settings', 'select'),
  'anon cannot read widget settings directly'
);

select ok(
  not has_table_privilege('anon', 'public.widget_leads', 'select'),
  'anon cannot read widget leads directly'
);

select has_index(
  'public',
  'widget_leads',
  'idx_widget_leads_tenant_created',
  'widget lead tenant/date index exists'
);

select has_index(
  'public',
  'widget_events',
  'idx_widget_events_tenant_name_occurred',
  'widget analytics tenant/event index exists'
);

select ok(
  to_regprocedure('public.consume_widget_rate_limit(text,text,integer,integer)') is not null,
  'atomic rate-limit function exists'
);

select ok(
  (select not public from storage.buckets where id = 'widget-uploads'),
  'widget upload bucket is private'
);

select ok(
  not has_table_privilege('anon', 'public.widget_rate_limits', 'select'),
  'anon cannot read rate-limit state'
);

select * from finish();

rollback;
