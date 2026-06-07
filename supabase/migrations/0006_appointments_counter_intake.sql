create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  repair_id uuid references public.repairs(id) on delete set null,
  repair_number text,
  appointment_number text,
  client_mode text,
  client_name text,
  client_phone text,
  client_email text,
  device_type text,
  device_brand text,
  device_model text,
  imei text,
  serial_number text,
  issue_description text,
  intervention_label text,
  customer_price numeric,
  estimated_total numeric,
  price_status text check (price_status is null or price_status in ('confirmed', 'to_confirm', 'diagnostic')),
  price_snapshot jsonb,
  appointment_date date,
  appointment_time text,
  appointment_reason text,
  source text,
  status text not null default 'pending',
  notes text,
  converted_to_repair_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_appointments_workshop_date on public.appointments(workshop_id, appointment_date, appointment_time);
create index if not exists idx_appointments_client_id on public.appointments(client_id);
create index if not exists idx_appointments_repair_id on public.appointments(repair_id);

alter table public.appointments enable row level security;
drop trigger if exists trg_appointments_touch on public.appointments;
create trigger trg_appointments_touch before update on public.appointments for each row execute function public.touch_updated_at();
