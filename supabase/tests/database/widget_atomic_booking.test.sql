begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

select has_table('public', 'shop_schedule_exceptions', 'schedule exceptions table exists');
select has_table('public', 'shop_technicians', 'shop technicians table exists');
select has_table('public', 'technician_absences', 'technician absences table exists');
select has_table('public', 'widget_appointment_confirmations', 'customer confirmation outbox exists');
select has_column('public', 'appointments', 'duration_minutes', 'appointment duration is persisted');
select has_column('public', 'appointments', 'is_pre_intake', 'pre-intake marker is persisted');
select has_column('public', 'appointments', 'dashboard_imported_at', 'dashboard import is tracked');

select ok(
  (select bool_and(c.relrowsecurity)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in (
     'shop_schedule_exceptions', 'shop_technicians', 'technician_absences', 'widget_appointment_confirmations'
   )),
  'RLS protects every booking administration table'
);
select ok(not has_table_privilege('anon', 'public.technician_absences', 'select'), 'anon cannot read absences');
select ok(not has_function_privilege('anon', 'public.reserve_widget_appointment(uuid,uuid,uuid,uuid,date,time,integer,text,jsonb)', 'execute'), 'anon cannot reserve through the database function');

insert into public.workshops (id, name) values ('10000000-0000-4000-a000-000000000001', 'Booking test');
insert into public.team_members (id, workshop_id, name, role)
values ('10000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'Technicien test', 'Technicien');
insert into public.clients (id, workshop_id, full_name, phone)
values ('10000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', 'Client test', '+33600000000');
insert into public.shops (
  id, tenant_id, public_shop_id, internal_name, timezone, schedule_config
) values (
  '10000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000001',
  'shop_booking_test_1234', 'Boutique test', 'Europe/Paris',
  '{"capacity":1,"minimumNoticeMinutes":0,"slotIntervalMinutes":30,"defaultDurationMinutes":60}'::jsonb
);
insert into public.widget_settings (
  id, tenant_id, shop_id, public_widget_id, internal_name, active,
  published_config, published_version, published_at
) values (
  '10000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000001',
  '10000000-0000-4000-a000-000000000004', 'wdg_booking_test_1234', 'Widget booking', true,
  '{"booking":{"days":[1,2,3,4,5,6,7],"start":"09:00","end":"18:00","durationMinutes":60,"capacity":1}}'::jsonb,
  1, now()
);
insert into public.widget_versions (
  id, widget_id, tenant_id, version, configuration, published_at, status
) values (
  '10000000-0000-4000-a000-000000000006', '10000000-0000-4000-a000-000000000005',
  '10000000-0000-4000-a000-000000000001', 1, '{}'::jsonb, now(), 'published'
);
insert into public.widget_leads (
  id, tenant_id, shop_id, widget_id, widget_version, customer_id, lead_type,
  phone, phone_normalized, device_category, model, issue, consent, idempotency_key
) values
  ('10000000-0000-4000-a000-000000000007', '10000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000005', 1, '10000000-0000-4000-a000-000000000003', 'appointment', '+33600000000', '+33600000000', 'Smartphone', 'Test', 'Écran', '{}'::jsonb, 'booking-key-000001'),
  ('10000000-0000-4000-a000-000000000008', '10000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000005', 1, '10000000-0000-4000-a000-000000000003', 'appointment', '+33600000000', '+33600000000', 'Smartphone', 'Test', 'Écran', '{}'::jsonb, 'booking-key-000002');

create temporary table booking_results (sequence integer, result jsonb);
insert into booking_results values (
  1,
  public.reserve_widget_appointment(
    '10000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000004',
    '10000000-0000-4000-a000-000000000007', '10000000-0000-4000-a000-000000000003',
    current_date + 7, '10:00', 60, 'booking-key-000001',
    '{"clientName":"Client test","clientPhone":"+33600000000","deviceType":"Smartphone","deviceModel":"Test","issueDescription":"Écran","preIntakeSnapshot":{"issue":"Écran"}}'::jsonb
  )
);
insert into booking_results values (
  2,
  public.reserve_widget_appointment(
    '10000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000004',
    '10000000-0000-4000-a000-000000000008', '10000000-0000-4000-a000-000000000003',
    current_date + 7, '10:00', 60, 'booking-key-000002', '{}'::jsonb
  )
);

select ok((select (result->>'accepted')::boolean from booking_results where sequence = 1), 'first reservation succeeds');
select ok(not (select (result->>'accepted')::boolean from booking_results where sequence = 2), 'competing reservation is refused');
select is((select result->>'reason' from booking_results where sequence = 2), 'capacity', 'refusal reports exhausted capacity');
select is((select count(*) from public.appointments where widget_id = '10000000-0000-4000-a000-000000000005'), 1::bigint, 'only one appointment occupies the slot');
select ok((select repair_id is null and is_pre_intake from public.appointments where widget_id = '10000000-0000-4000-a000-000000000005'), 'booking creates a pre-intake without active repair');
select is((select status from public.appointments where widget_id = '10000000-0000-4000-a000-000000000005'), 'confirmed', 'appointment is confirmed');
select is((select count(*) from public.widget_appointment_confirmations), 1::bigint, 'one customer confirmation is queued');
select ok(
  not (public.widget_booking_slot_status(
    '10000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000004',
    current_date + 7, '10:30', 60
  )->>'available')::boolean,
  'duration overlap blocks a partially overlapping slot'
);
select ok(
  (public.reserve_widget_appointment(
    '10000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000004',
    '10000000-0000-4000-a000-000000000007', '10000000-0000-4000-a000-000000000003',
    current_date + 7, '10:00', 60, 'booking-key-000001', '{}'::jsonb
  )->>'duplicate')::boolean,
  'same idempotency key returns the existing booking'
);

insert into public.shop_schedule_exceptions (
  tenant_id, shop_id, exception_date, exception_type, label
) values (
  '10000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000004',
  current_date + 8, 'holiday', 'Jour férié test'
);
select ok(
  not (public.widget_booking_slot_status(
    '10000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000004',
    current_date + 8, '10:00', 60
  )->>'available')::boolean,
  'holiday removes a public slot'
);

insert into public.shop_technicians (tenant_id, shop_id, technician_id)
values (
  '10000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000004',
  '10000000-0000-4000-a000-000000000002'
);
insert into public.technician_absences (tenant_id, shop_id, technician_id, starts_at, ends_at)
values (
  '10000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000004',
  '10000000-0000-4000-a000-000000000002',
  ((current_date + 9) + '09:00'::time) at time zone 'Europe/Paris',
  ((current_date + 9) + '12:00'::time) at time zone 'Europe/Paris'
);
select ok(
  not (public.widget_booking_slot_status(
    '10000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000004',
    current_date + 9, '10:00', 60
  )->>'available')::boolean,
  'technician absence removes the slot'
);

insert into public.shop_schedule_exceptions (
  tenant_id, shop_id, exception_date, starts_at, ends_at, exception_type, label
) values (
  '10000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000004',
  current_date + 10, '12:00', '13:00', 'break', 'Pause test'
);
select ok(
  not (public.widget_booking_slot_status(
    '10000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000004',
    current_date + 10, '12:30', 30
  )->>'available')::boolean,
  'shop break removes overlapping slots'
);
select has_index('public', 'appointments', 'idx_appointments_booking_overlap', 'overlap lookup is indexed');

select * from finish();
rollback;
