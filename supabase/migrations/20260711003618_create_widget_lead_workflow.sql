-- Workflow interne des demandes provenant du widget.
-- Les tables restent inaccessibles à anon/authenticated : seule l'API serveur
-- protégée par la licence atelier utilise le service_role.

alter table public.quotes
  add constraint quotes_workshop_id_id_key unique (workshop_id, id);

alter table public.widget_leads
  drop constraint if exists widget_leads_type_check,
  drop constraint if exists widget_leads_status_check;

alter table public.widget_leads
  add column if not exists quote_id uuid,
  add column if not exists submission_payload jsonb not null default '{}'::jsonb,
  add column if not exists conversion_reference text,
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists closed_at timestamptz,
  add column if not exists spam_at timestamptz,
  add constraint widget_leads_quote_tenant_fk
    foreign key (tenant_id, quote_id)
    references public.quotes(workshop_id, id) on delete set null (quote_id),
  add constraint widget_leads_type_check
    check (lead_type in ('callback', 'quote', 'price_request', 'request', 'appointment')),
  add constraint widget_leads_status_check
    check (
      status in (
        'new',
        'to_contact',
        'contacted',
        'in_progress',
        'waiting_customer',
        'converted_appointment',
        'converted_quote',
        'converted_repair',
        'closed',
        'spam'
      )
    ),
  add constraint widget_leads_submission_payload_object
    check (jsonb_typeof(submission_payload) = 'object');

create index idx_widget_leads_tenant_activity
  on public.widget_leads (tenant_id, last_activity_at desc);

create index idx_widget_leads_quote
  on public.widget_leads (quote_id)
  where quote_id is not null;

create table public.widget_lead_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  lead_id uuid not null,
  action text not null,
  from_status text,
  to_status text,
  actor_id text,
  actor_name text not null default 'Système',
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint widget_lead_history_lead_tenant_fk
    foreign key (tenant_id, lead_id)
    references public.widget_leads(tenant_id, id) on delete cascade,
  constraint widget_lead_history_action_not_blank check (btrim(action) <> ''),
  constraint widget_lead_history_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index idx_widget_lead_history_lead_created
  on public.widget_lead_history (tenant_id, lead_id, created_at desc);

create table public.widget_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  lead_id uuid not null,
  notification_type text not null default 'widget_lead_created',
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint widget_notifications_lead_tenant_fk
    foreign key (tenant_id, lead_id)
    references public.widget_leads(tenant_id, id) on delete cascade,
  constraint widget_notifications_type_not_blank check (btrim(notification_type) <> ''),
  constraint widget_notifications_title_not_blank check (btrim(title) <> ''),
  constraint widget_notifications_message_not_blank check (btrim(message) <> '')
);

create index idx_widget_notifications_unread
  on public.widget_notifications (tenant_id, created_at desc)
  where read_at is null;

alter table public.widget_lead_history enable row level security;
alter table public.widget_notifications enable row level security;

revoke all on table public.widget_lead_history from anon, authenticated;
revoke all on table public.widget_notifications from anon, authenticated;

create policy "widget_lead_history_deny_anon"
  on public.widget_lead_history for all to anon using (false) with check (false);
create policy "widget_lead_history_deny_authenticated"
  on public.widget_lead_history for all to authenticated using (false) with check (false);
create policy "widget_notifications_deny_anon"
  on public.widget_notifications for all to anon using (false) with check (false);
create policy "widget_notifications_deny_authenticated"
  on public.widget_notifications for all to authenticated using (false) with check (false);

grant all on table public.widget_lead_history to service_role;
grant all on table public.widget_notifications to service_role;

create or replace function public.record_widget_lead_workflow()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.widget_lead_history (
      tenant_id, lead_id, action, to_status, actor_name, note
    ) values (
      new.tenant_id,
      new.id,
      'submitted',
      new.status,
      'Client widget',
      'Demande reçue depuis le site internet'
    );

    insert into public.widget_notifications (
      tenant_id, lead_id, title, message
    ) values (
      new.tenant_id,
      new.id,
      'Nouvelle demande du site',
      concat_ws(' · ', nullif(btrim(concat_ws(' ', new.first_name, new.last_name)), ''), new.model, new.issue)
    );
    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.widget_lead_history (
      tenant_id, lead_id, action, from_status, to_status, actor_name
    ) values (
      new.tenant_id, new.id, 'status_changed', old.status, new.status, 'Dashboard'
    );
  end if;

  if old.assigned_to is distinct from new.assigned_to then
    insert into public.widget_lead_history (
      tenant_id, lead_id, action, actor_name, metadata
    ) values (
      new.tenant_id,
      new.id,
      'assigned',
      'Dashboard',
      jsonb_build_object('assignedTo', new.assigned_to)
    );
  end if;

  return new;
end;
$$;

create trigger trg_widget_lead_workflow_insert
  after insert on public.widget_leads
  for each row execute function public.record_widget_lead_workflow();

create trigger trg_widget_lead_workflow_update
  after update of status, assigned_to on public.widget_leads
  for each row execute function public.record_widget_lead_workflow();

revoke all on function public.record_widget_lead_workflow() from public;
grant execute on function public.record_widget_lead_workflow() to service_role;
