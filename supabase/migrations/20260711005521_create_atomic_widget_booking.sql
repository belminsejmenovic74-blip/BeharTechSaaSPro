-- Réservation publique atomique du widget.
--
-- Les plages sont exprimées dans le fuseau de la boutique. `schedule_config`
-- reste la source des horaires récurrents :
-- {
--   "weeklyHours": {"1":[{"start":"09:00","end":"18:00"}]},
--   "breaks": {"1":[{"start":"12:00","end":"13:00"}]},
--   "capacity": 2, "minimumNoticeMinutes": 120,
--   "slotIntervalMinutes": 30, "defaultDurationMinutes": 30
-- }

create table public.shop_schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  shop_id uuid not null,
  exception_date date not null,
  starts_at time,
  ends_at time,
  exception_type text not null,
  label text,
  created_at timestamptz not null default now(),
  constraint shop_schedule_exceptions_shop_tenant_fk
    foreign key (tenant_id, shop_id) references public.shops(tenant_id, id) on delete cascade,
  constraint shop_schedule_exceptions_type_check
    check (exception_type in ('closure', 'holiday', 'break')),
  constraint shop_schedule_exceptions_time_check
    check ((starts_at is null and ends_at is null) or (starts_at is not null and ends_at > starts_at))
);

create index idx_shop_schedule_exceptions_lookup
  on public.shop_schedule_exceptions (tenant_id, shop_id, exception_date, starts_at, ends_at);

create table public.shop_technicians (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  shop_id uuid not null,
  technician_id uuid not null,
  booking_enabled boolean not null default true,
  weekly_availability jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_technicians_shop_tenant_fk
    foreign key (tenant_id, shop_id) references public.shops(tenant_id, id) on delete cascade,
  constraint shop_technicians_member_tenant_fk
    foreign key (tenant_id, technician_id) references public.team_members(workshop_id, id) on delete cascade,
  constraint shop_technicians_unique unique (shop_id, technician_id),
  constraint shop_technicians_availability_object check (jsonb_typeof(weekly_availability) = 'object')
);

create index idx_shop_technicians_booking
  on public.shop_technicians (tenant_id, shop_id, booking_enabled);
create index idx_shop_technicians_member
  on public.shop_technicians (tenant_id, technician_id);

create table public.technician_absences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  shop_id uuid not null,
  technician_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint technician_absences_shop_tenant_fk
    foreign key (tenant_id, shop_id) references public.shops(tenant_id, id) on delete cascade,
  constraint technician_absences_member_tenant_fk
    foreign key (tenant_id, technician_id) references public.team_members(workshop_id, id) on delete cascade,
  constraint technician_absences_range_check check (ends_at > starts_at)
);

create index idx_technician_absences_lookup
  on public.technician_absences (tenant_id, shop_id, technician_id, starts_at, ends_at);

alter table public.appointments
  add column if not exists duration_minutes integer not null default 30,
  add column if not exists assigned_technician_id uuid,
  add column if not exists is_pre_intake boolean not null default false,
  add column if not exists pre_intake_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists dashboard_imported_at timestamptz,
  add constraint appointments_duration_minutes_check check (duration_minutes between 5 and 1440),
  add constraint appointments_pre_intake_snapshot_object check (jsonb_typeof(pre_intake_snapshot) = 'object'),
  add constraint appointments_assigned_technician_tenant_fk
    foreign key (workshop_id, assigned_technician_id)
    references public.team_members(workshop_id, id) on delete set null (assigned_technician_id);

create index idx_appointments_booking_overlap
  on public.appointments (workshop_id, shop_id, appointment_date, appointment_time)
  where status not in ('cancelled', 'Annulé');
create index idx_appointments_assigned_technician
  on public.appointments (workshop_id, assigned_technician_id)
  where assigned_technician_id is not null;
create index idx_appointments_widget_dashboard_import
  on public.appointments (workshop_id, created_at)
  where source = 'Widget site internet' and dashboard_imported_at is null and repair_id is null;

create table public.widget_appointment_confirmations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  widget_id uuid not null,
  lead_id uuid not null,
  appointment_id uuid not null,
  channel text not null,
  destination_masked text,
  status text not null default 'queued',
  confirmation_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint widget_appointment_confirmations_widget_tenant_fk
    foreign key (tenant_id, widget_id) references public.widget_settings(tenant_id, id) on delete cascade,
  constraint widget_appointment_confirmations_lead_tenant_fk
    foreign key (tenant_id, lead_id) references public.widget_leads(tenant_id, id) on delete cascade,
  constraint widget_appointment_confirmations_appointment_tenant_fk
    foreign key (tenant_id, appointment_id) references public.appointments(workshop_id, id) on delete cascade,
  constraint widget_appointment_confirmations_channel_check check (channel in ('sms', 'email', 'screen')),
  constraint widget_appointment_confirmations_status_check check (status in ('queued', 'sent', 'failed')),
  constraint widget_appointment_confirmations_payload_object check (jsonb_typeof(confirmation_payload) = 'object')
);

create index idx_widget_appointment_confirmations_pending
  on public.widget_appointment_confirmations (tenant_id, status, created_at)
  where status = 'queued';
create index idx_widget_appointment_confirmations_widget
  on public.widget_appointment_confirmations (tenant_id, widget_id);
create index idx_widget_appointment_confirmations_lead
  on public.widget_appointment_confirmations (tenant_id, lead_id);
create index idx_widget_appointment_confirmations_appointment
  on public.widget_appointment_confirmations (tenant_id, appointment_id);

alter table public.shop_schedule_exceptions enable row level security;
alter table public.shop_technicians enable row level security;
alter table public.technician_absences enable row level security;
alter table public.widget_appointment_confirmations enable row level security;

revoke all on table public.shop_schedule_exceptions, public.shop_technicians,
  public.technician_absences, public.widget_appointment_confirmations from anon, authenticated;
grant all on table public.shop_schedule_exceptions, public.shop_technicians,
  public.technician_absences, public.widget_appointment_confirmations to service_role;

create policy "shop_schedule_exceptions_deny_anon" on public.shop_schedule_exceptions
  for all to anon using (false) with check (false);
create policy "shop_schedule_exceptions_deny_authenticated" on public.shop_schedule_exceptions
  for all to authenticated using (false) with check (false);
create policy "shop_technicians_deny_anon" on public.shop_technicians
  for all to anon using (false) with check (false);
create policy "shop_technicians_deny_authenticated" on public.shop_technicians
  for all to authenticated using (false) with check (false);
create policy "technician_absences_deny_anon" on public.technician_absences
  for all to anon using (false) with check (false);
create policy "technician_absences_deny_authenticated" on public.technician_absences
  for all to authenticated using (false) with check (false);
create policy "widget_appointment_confirmations_deny_anon" on public.widget_appointment_confirmations
  for all to anon using (false) with check (false);
create policy "widget_appointment_confirmations_deny_authenticated" on public.widget_appointment_confirmations
  for all to authenticated using (false) with check (false);

create or replace function public.widget_ranges_contain(
  p_ranges jsonb,
  p_start time,
  p_end time
) returns boolean
language sql
immutable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_array_length(coalesce(p_ranges, '[]'::jsonb)) = 0
    or exists (
      select 1
      from jsonb_array_elements(coalesce(p_ranges, '[]'::jsonb)) as item
      where (item->>'start')::time <= p_start
        and (item->>'end')::time >= p_end
    ),
    true
  );
$$;

create or replace function public.widget_ranges_overlap(
  p_ranges jsonb,
  p_start time,
  p_end time
) returns boolean
language sql
immutable
security invoker
set search_path = public
as $$
  select coalesce(exists (
    select 1
    from jsonb_array_elements(coalesce(p_ranges, '[]'::jsonb)) as item
    where (item->>'start')::time < p_end
      and (item->>'end')::time > p_start
  ), false);
$$;

create or replace function public.widget_booking_slot_status(
  p_widget_id uuid,
  p_shop_id uuid,
  p_date date,
  p_time time,
  p_duration_minutes integer default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_widget public.widget_settings%rowtype;
  v_shop public.shops%rowtype;
  v_booking jsonb;
  v_schedule jsonb;
  v_day integer := extract(isodow from p_date);
  v_duration integer;
  v_start time := p_time;
  v_end time;
  v_start_ts timestamp;
  v_end_ts timestamp;
  v_start_tz timestamptz;
  v_end_tz timestamptz;
  v_capacity integer;
  v_technician_count integer;
  v_occupied integer;
  v_default_start time;
  v_default_end time;
  v_weekly jsonb;
  v_breaks jsonb;
  v_minimum_notice integer;
  v_reason text;
begin
  select * into v_widget from public.widget_settings where id = p_widget_id;
  select * into v_shop from public.shops where id = p_shop_id;
  if v_widget.id is null or v_shop.id is null
    or v_widget.tenant_id <> v_shop.tenant_id
    or not v_widget.active or v_widget.published_config is null
    or (v_widget.shop_id is not null and v_widget.shop_id <> v_shop.id)
  then return jsonb_build_object('available', false, 'reason', 'invalid_widget'); end if;

  v_booking := coalesce(v_widget.published_config->'booking', '{}'::jsonb);
  v_schedule := coalesce(v_shop.schedule_config, '{}'::jsonb);
  v_duration := greatest(5, least(1440, coalesce(
    p_duration_minutes,
    nullif(v_schedule->>'defaultDurationMinutes', '')::integer,
    nullif(v_booking->>'durationMinutes', '')::integer,
    30
  )));
  v_end := v_start + make_interval(mins => v_duration);
  v_start_ts := p_date + v_start;
  v_end_ts := v_start_ts + make_interval(mins => v_duration);
  v_start_tz := v_start_ts at time zone v_shop.timezone;
  v_end_tz := v_end_ts at time zone v_shop.timezone;
  v_minimum_notice := greatest(0, coalesce(
    nullif(v_schedule->>'minimumNoticeMinutes', '')::integer,
    nullif(v_booking->>'minimumNoticeMinutes', '')::integer,
    0
  ));
  if v_start_tz < now() + make_interval(mins => v_minimum_notice) then
    return jsonb_build_object('available', false, 'reason', 'minimum_notice');
  end if;

  if jsonb_typeof(v_booking->'days') = 'array' and not exists (
    select 1 from jsonb_array_elements_text(v_booking->'days') as day_value
    where day_value::integer = v_day
  ) then return jsonb_build_object('available', false, 'reason', 'closed_day'); end if;

  v_default_start := coalesce(nullif(v_booking->>'start', '')::time, '09:00'::time);
  v_default_end := coalesce(nullif(v_booking->>'end', '')::time, '18:00'::time);
  v_weekly := v_schedule->'weeklyHours'->(v_day::text);
  if jsonb_typeof(v_weekly) = 'array' then
    if not public.widget_ranges_contain(v_weekly, v_start, v_end) then v_reason := 'outside_hours'; end if;
  elsif not (v_default_start <= v_start and v_default_end >= v_end) then
    v_reason := 'outside_hours';
  end if;
  if v_reason is not null then return jsonb_build_object('available', false, 'reason', v_reason); end if;

  v_breaks := v_schedule->'breaks'->(v_day::text);
  if jsonb_typeof(v_breaks) = 'array' and public.widget_ranges_overlap(v_breaks, v_start, v_end) then
    return jsonb_build_object('available', false, 'reason', 'break');
  end if;
  if exists (
    select 1 from public.shop_schedule_exceptions exception
    where exception.tenant_id = v_widget.tenant_id and exception.shop_id = v_shop.id
      and exception.exception_date = p_date
      and (exception.starts_at is null or (exception.starts_at < v_end and exception.ends_at > v_start))
  ) then return jsonb_build_object('available', false, 'reason', 'exception'); end if;

  v_capacity := greatest(1, least(50, coalesce(
    nullif(v_schedule->>'capacity', '')::integer,
    nullif(v_booking->>'capacity', '')::integer,
    1
  )));
  select count(*) into v_technician_count
  from public.shop_technicians st
  join public.team_members tm on tm.workshop_id = st.tenant_id and tm.id = st.technician_id and tm.is_active
  where st.tenant_id = v_widget.tenant_id and st.shop_id = v_shop.id and st.booking_enabled
    and public.widget_ranges_contain(st.weekly_availability->(v_day::text), v_start, v_end)
    and not exists (
      select 1 from public.technician_absences absence
      where absence.tenant_id = st.tenant_id and absence.shop_id = st.shop_id
        and absence.technician_id = st.technician_id
        and absence.starts_at < v_end_tz and absence.ends_at > v_start_tz
    );
  if exists (
    select 1 from public.shop_technicians st
    where st.tenant_id = v_widget.tenant_id and st.shop_id = v_shop.id and st.booking_enabled
  ) then v_capacity := least(v_capacity, v_technician_count); end if;
  if v_capacity <= 0 then return jsonb_build_object('available', false, 'reason', 'no_technician'); end if;

  select count(*) into v_occupied
  from public.appointments appointment
  where appointment.workshop_id = v_widget.tenant_id and appointment.shop_id = v_shop.id
    and appointment.appointment_date = p_date
    and appointment.status not in ('cancelled', 'Annulé')
    and appointment.appointment_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    and (p_date + appointment.appointment_time::time) < v_end_ts
    and (p_date + appointment.appointment_time::time
      + make_interval(mins => coalesce(appointment.duration_minutes, 30))) > v_start_ts;

  return jsonb_build_object(
    'available', v_occupied < v_capacity,
    'reason', case when v_occupied < v_capacity then null else 'capacity' end,
    'capacity', v_capacity,
    'occupied', v_occupied,
    'durationMinutes', v_duration
  );
exception when others then
  return jsonb_build_object('available', false, 'reason', 'invalid_schedule');
end;
$$;

create or replace function public.reserve_widget_appointment(
  p_widget_id uuid,
  p_shop_id uuid,
  p_lead_id uuid,
  p_customer_id uuid,
  p_date date,
  p_time time,
  p_duration_minutes integer,
  p_idempotency_key text,
  p_appointment jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_widget public.widget_settings%rowtype;
  v_status jsonb;
  v_existing uuid;
  v_appointment_id uuid;
  v_technician_id uuid;
  v_duration integer;
  v_channel text;
begin
  select * into v_widget from public.widget_settings where id = p_widget_id;
  if v_widget.id is null then return jsonb_build_object('accepted', false, 'reason', 'invalid_widget'); end if;

  -- Le verrou boutique sérialise toutes les plages du jour, y compris deux
  -- horaires différents qui se chevauchent à cause de leur durée.
  perform 1 from public.shops
  where id = p_shop_id and tenant_id = v_widget.tenant_id
  for update;
  if not found then return jsonb_build_object('accepted', false, 'reason', 'invalid_shop'); end if;

  select id into v_existing from public.appointments
  where widget_id = p_widget_id and idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return jsonb_build_object('accepted', true, 'duplicate', true, 'appointmentId', v_existing);
  end if;

  v_status := public.widget_booking_slot_status(p_widget_id, p_shop_id, p_date, p_time, p_duration_minutes);
  if not coalesce((v_status->>'available')::boolean, false) then
    return jsonb_build_object('accepted', false, 'reason', coalesce(v_status->>'reason', 'slot_unavailable'));
  end if;
  v_duration := (v_status->>'durationMinutes')::integer;

  select st.technician_id into v_technician_id
  from public.shop_technicians st
  join public.team_members tm on tm.workshop_id = st.tenant_id and tm.id = st.technician_id and tm.is_active
  join public.shops booking_shop on booking_shop.tenant_id = st.tenant_id and booking_shop.id = st.shop_id
  where st.tenant_id = v_widget.tenant_id and st.shop_id = p_shop_id and st.booking_enabled
    and public.widget_ranges_contain(
      st.weekly_availability->(extract(isodow from p_date)::integer::text),
      p_time,
      p_time + make_interval(mins => v_duration)
    )
    and not exists (
      select 1 from public.technician_absences absence
      where absence.tenant_id = st.tenant_id and absence.shop_id = st.shop_id
        and absence.technician_id = st.technician_id
        and absence.starts_at < ((p_date + p_time + make_interval(mins => v_duration)) at time zone booking_shop.timezone)
        and absence.ends_at > ((p_date + p_time) at time zone booking_shop.timezone)
    )
    and not exists (
      select 1 from public.appointments appointment
      where appointment.workshop_id = st.tenant_id and appointment.shop_id = st.shop_id
        and appointment.assigned_technician_id = st.technician_id and appointment.appointment_date = p_date
        and appointment.status not in ('cancelled', 'Annulé')
        and appointment.appointment_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        and (p_date + appointment.appointment_time::time) < (p_date + p_time + make_interval(mins => v_duration))
        and (p_date + appointment.appointment_time::time + make_interval(mins => appointment.duration_minutes)) > (p_date + p_time)
    )
  order by st.created_at
  limit 1;

  insert into public.appointments (
    workshop_id, shop_id, client_id, appointment_number, client_mode,
    client_name, client_phone, client_email, device_type, device_brand,
    device_model, issue_description, intervention_label, customer_price,
    price_status, price_snapshot, appointment_date, appointment_time,
    duration_minutes, source, source_id, status, notes, widget_id,
    widget_lead_id, widget_version, confirmation_status,
    stock_confirmation_required, price_confirmation_required,
    idempotency_key, assigned_technician_id, is_pre_intake, pre_intake_snapshot
  ) values (
    v_widget.tenant_id, p_shop_id, p_customer_id,
    'RDV-W-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 9)),
    case when p_customer_id is null then 'new' else 'existing' end,
    nullif(p_appointment->>'clientName', ''), nullif(p_appointment->>'clientPhone', ''),
    nullif(p_appointment->>'clientEmail', ''), nullif(p_appointment->>'deviceType', ''),
    nullif(p_appointment->>'deviceBrand', ''), nullif(p_appointment->>'deviceModel', ''),
    nullif(p_appointment->>'issueDescription', ''), nullif(p_appointment->>'interventionLabel', ''),
    nullif(p_appointment->>'customerPrice', '')::numeric,
    coalesce(nullif(p_appointment->>'priceStatus', ''), 'to_confirm'),
    coalesce(p_appointment->'priceSnapshot', '{}'::jsonb), p_date, to_char(p_time, 'HH24:MI'),
    v_duration, 'Widget site internet', p_lead_id, 'confirmed',
    nullif(p_appointment->>'notes', ''), p_widget_id, p_lead_id,
    v_widget.published_version, 'confirmed',
    coalesce((p_appointment->>'stockConfirmationRequired')::boolean, true),
    coalesce((p_appointment->>'priceConfirmationRequired')::boolean, true),
    p_idempotency_key, v_technician_id, true,
    coalesce(p_appointment->'preIntakeSnapshot', '{}'::jsonb)
  ) returning id into v_appointment_id;

  update public.widget_leads
  set appointment_id = v_appointment_id, status = 'converted_appointment', last_activity_at = now()
  where id = p_lead_id and tenant_id = v_widget.tenant_id and widget_id = p_widget_id;
  if not found then raise exception 'widget lead mismatch'; end if;

  v_channel := case
    when nullif(p_appointment->>'clientPhone', '') is not null then 'sms'
    when nullif(p_appointment->>'clientEmail', '') is not null then 'email'
    else 'screen'
  end;
  insert into public.widget_appointment_confirmations (
    tenant_id, widget_id, lead_id, appointment_id, channel,
    destination_masked, status, confirmation_payload
  ) values (
    v_widget.tenant_id, p_widget_id, p_lead_id, v_appointment_id, v_channel,
    nullif(p_appointment->>'destinationMasked', ''),
    case when v_channel = 'screen' then 'sent' else 'queued' end,
    jsonb_build_object('date', p_date, 'time', to_char(p_time, 'HH24:MI'), 'durationMinutes', v_duration)
  );

  return jsonb_build_object(
    'accepted', true, 'duplicate', false, 'appointmentId', v_appointment_id,
    'status', 'confirmed', 'date', p_date, 'time', to_char(p_time, 'HH24:MI'),
    'durationMinutes', v_duration
  );
exception when unique_violation then
  select id into v_existing from public.appointments
  where widget_id = p_widget_id and idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return jsonb_build_object('accepted', true, 'duplicate', true, 'appointmentId', v_existing);
  end if;
  raise;
end;
$$;

create or replace function public.widget_available_slots(
  p_widget_id uuid,
  p_shop_id uuid,
  p_from date,
  p_days integer default 14,
  p_duration_minutes integer default null
) returns table(slot_date date, slot_time text, duration_minutes integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_widget public.widget_settings%rowtype;
  v_booking jsonb;
  v_schedule jsonb;
  v_interval integer;
  v_duration integer;
  v_start time;
  v_end time;
  v_cursor time;
  v_date date;
  v_status jsonb;
  v_offset integer;
begin
  select * into v_widget from public.widget_settings where id = p_widget_id;
  if v_widget.id is null then return; end if;
  select schedule_config into v_schedule from public.shops
  where id = p_shop_id and tenant_id = v_widget.tenant_id and active;
  if not found then return; end if;
  v_booking := coalesce(v_widget.published_config->'booking', '{}'::jsonb);
  v_schedule := coalesce(v_schedule, '{}'::jsonb);
  v_interval := greatest(5, least(180, coalesce(
    nullif(v_schedule->>'slotIntervalMinutes', '')::integer,
    nullif(v_booking->>'intervalMinutes', '')::integer,
    30
  )));
  v_duration := greatest(5, least(1440, coalesce(
    p_duration_minutes,
    nullif(v_schedule->>'defaultDurationMinutes', '')::integer,
    nullif(v_booking->>'durationMinutes', '')::integer,
    30
  )));
  v_start := coalesce(nullif(v_booking->>'start', '')::time, '09:00'::time);
  v_end := coalesce(nullif(v_booking->>'end', '')::time, '18:00'::time);

  for v_offset in 0..greatest(0, least(31, p_days) - 1) loop
    v_date := p_from + v_offset;
    v_cursor := v_start;
    while v_cursor + make_interval(mins => v_duration) <= v_end loop
      v_status := public.widget_booking_slot_status(
        p_widget_id, p_shop_id, v_date, v_cursor, v_duration
      );
      if coalesce((v_status->>'available')::boolean, false) then
        slot_date := v_date;
        slot_time := to_char(v_cursor, 'HH24:MI');
        duration_minutes := v_duration;
        return next;
      end if;
      v_cursor := v_cursor + make_interval(mins => v_interval);
    end loop;
  end loop;
end;
$$;

revoke all on function public.widget_ranges_contain(jsonb, time, time) from public;
revoke all on function public.widget_ranges_overlap(jsonb, time, time) from public;
revoke all on function public.widget_booking_slot_status(uuid, uuid, date, time, integer) from public;
revoke all on function public.reserve_widget_appointment(uuid, uuid, uuid, uuid, date, time, integer, text, jsonb) from public;
revoke all on function public.widget_available_slots(uuid, uuid, date, integer, integer) from public;
revoke all on function public.widget_ranges_contain(jsonb, time, time) from anon, authenticated;
revoke all on function public.widget_ranges_overlap(jsonb, time, time) from anon, authenticated;
revoke all on function public.widget_booking_slot_status(uuid, uuid, date, time, integer) from anon, authenticated;
revoke all on function public.reserve_widget_appointment(uuid, uuid, uuid, uuid, date, time, integer, text, jsonb) from anon, authenticated;
revoke all on function public.widget_available_slots(uuid, uuid, date, integer, integer) from anon, authenticated;
grant execute on function public.widget_ranges_contain(jsonb, time, time) to service_role;
grant execute on function public.widget_ranges_overlap(jsonb, time, time) to service_role;
grant execute on function public.widget_booking_slot_status(uuid, uuid, date, time, integer) to service_role;
grant execute on function public.reserve_widget_appointment(uuid, uuid, uuid, uuid, date, time, integer, text, jsonb) to service_role;
grant execute on function public.widget_available_slots(uuid, uuid, date, integer, integer) to service_role;
