-- Generate every customer-facing slot from the shop's real daily ranges.
-- This fixes two issues from the first implementation:
-- 1. days were always scanned from 09:00 to 18:00, hiding earlier/later hours;
-- 2. split days (lunch break) were only filtered after generating a continuous range.
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
  v_day integer;
  v_daily_ranges jsonb;
  v_range jsonb;
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

  for v_offset in 0..greatest(0, least(31, p_days) - 1) loop
    v_date := p_from + v_offset;
    v_day := extract(isodow from v_date)::integer;
    v_daily_ranges := v_schedule->'weeklyHours'->(v_day::text);

    if jsonb_typeof(v_daily_ranges) <> 'array' then
      v_daily_ranges := jsonb_build_array(jsonb_build_object(
        'start', coalesce(v_booking->>'start', '09:00'),
        'end', coalesce(v_booking->>'end', '18:00')
      ));
    end if;

    for v_range in select value from jsonb_array_elements(v_daily_ranges) loop
      begin
        v_start := nullif(v_range->>'start', '')::time;
        v_end := nullif(v_range->>'end', '')::time;
      exception when others then
        continue;
      end;
      if v_start is null or v_end is null or v_start >= v_end then continue; end if;

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
  end loop;
end;
$$;

revoke all on function public.widget_available_slots(uuid, uuid, date, integer, integer) from public, anon, authenticated;
grant execute on function public.widget_available_slots(uuid, uuid, date, integer, integer) to service_role;
