-- Widget client Behar Tech Pro — schéma initial, strictement additif.
--
-- Principes :
--   * tenant_id référence l'atelier existant public.workshops(id) ;
--   * clients, rendez-vous et réparations restent les objets métier existants ;
--   * aucune donnée personnelle du widget n'est accessible directement à anon ;
--   * l'API Next.js server-only, après résolution du tenant, est le seul point
--     d'entrée public. Le service_role n'est jamais transmis au navigateur.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Boutiques : l'application possédait des shopId applicatifs, mais aucune
-- entité relationnelle. Cette table est additive et permet de garantir les FK
-- tenant + boutique du widget sans modifier les données métier existantes.
-- ---------------------------------------------------------------------------

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  public_shop_id text not null default ('shop_' || replace(gen_random_uuid()::text, '-', '')),
  internal_name text not null,
  commercial_name text,
  active boolean not null default true,
  timezone text not null default 'Europe/Paris',
  address_config jsonb not null default '{}'::jsonb,
  schedule_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shops_public_shop_id_key unique (public_shop_id),
  constraint shops_tenant_id_id_key unique (tenant_id, id),
  constraint shops_internal_name_not_blank check (btrim(internal_name) <> ''),
  constraint shops_public_id_format check (public_shop_id ~ '^shop_[a-zA-Z0-9_-]{12,80}$'),
  constraint shops_address_config_object check (jsonb_typeof(address_config) = 'object'),
  constraint shops_schedule_config_object check (jsonb_typeof(schedule_config) = 'object')
);

-- Clés composites requises pour empêcher une liaison cross-tenant dans les
-- futures tables widget. L'id reste la clé primaire globale existante.
alter table public.team_members
  add constraint team_members_workshop_id_id_key unique (workshop_id, id);

alter table public.appointments
  add constraint appointments_workshop_id_id_key unique (workshop_id, id);

alter table public.repairs
  add constraint repairs_workshop_id_id_key unique (workshop_id, id);

-- Colonnes normalisées dédiées à la recherche de clients existants. Elles sont
-- calculées depuis les colonnes actuelles : aucune valeur existante n'est
-- remplacée et aucun doublon historique n'est supprimé.
alter table public.clients
  add column if not exists phone_normalized text
    generated always as (regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g')) stored,
  add column if not exists email_normalized text
    generated always as (lower(btrim(coalesce(email, '')))) stored;

-- ---------------------------------------------------------------------------
-- Configuration mutable et pointeur de publication.
-- ---------------------------------------------------------------------------

create table public.widget_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  shop_id uuid,
  public_widget_id text not null default ('wdg_' || replace(gen_random_uuid()::text, '-', '')),
  internal_name text not null,
  active boolean not null default false,
  display_mode text not null default 'inline',
  general_config jsonb not null default '{}'::jsonb,
  visual_config jsonb not null default '{}'::jsonb,
  text_config jsonb not null default '{}'::jsonb,
  icon_config jsonb not null default '{}'::jsonb,
  step_config jsonb not null default '{}'::jsonb,
  field_config jsonb not null default '{}'::jsonb,
  price_config jsonb not null default '{}'::jsonb,
  stock_config jsonb not null default '{}'::jsonb,
  booking_config jsonb not null default '{}'::jsonb,
  notification_config jsonb not null default '{}'::jsonb,
  allowed_domains text[] not null default '{}'::text[],
  draft_config jsonb not null default '{}'::jsonb,
  published_config jsonb,
  published_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint widget_settings_public_widget_id_key unique (public_widget_id),
  constraint widget_settings_tenant_id_id_key unique (tenant_id, id),
  constraint widget_settings_shop_tenant_fk
    foreign key (tenant_id, shop_id) references public.shops(tenant_id, id) on delete restrict,
  constraint widget_settings_internal_name_not_blank check (btrim(internal_name) <> ''),
  constraint widget_settings_public_id_format check (public_widget_id ~ '^wdg_[a-zA-Z0-9_-]{12,80}$'),
  constraint widget_settings_display_mode_check check (display_mode in ('inline', 'modal', 'floating')),
  constraint widget_settings_published_version_check check (published_version >= 0),
  constraint widget_settings_general_object check (jsonb_typeof(general_config) = 'object'),
  constraint widget_settings_visual_object check (jsonb_typeof(visual_config) = 'object'),
  constraint widget_settings_text_object check (jsonb_typeof(text_config) = 'object'),
  constraint widget_settings_icon_object check (jsonb_typeof(icon_config) = 'object'),
  constraint widget_settings_step_object check (jsonb_typeof(step_config) = 'object'),
  constraint widget_settings_field_object check (jsonb_typeof(field_config) = 'object'),
  constraint widget_settings_price_object check (jsonb_typeof(price_config) = 'object'),
  constraint widget_settings_stock_object check (jsonb_typeof(stock_config) = 'object'),
  constraint widget_settings_booking_object check (jsonb_typeof(booking_config) = 'object'),
  constraint widget_settings_notification_object check (jsonb_typeof(notification_config) = 'object'),
  constraint widget_settings_draft_object check (jsonb_typeof(draft_config) = 'object'),
  constraint widget_settings_published_object check (
    published_config is null or jsonb_typeof(published_config) = 'object'
  ),
  constraint widget_settings_publish_state_check check (
    (published_version = 0 and published_config is null and published_at is null)
    or (published_version > 0 and published_config is not null and published_at is not null)
  )
);

comment on column public.widget_settings.tenant_id is
  'Tenant Behar Tech Pro ; correspond à public.workshops.id.';
comment on column public.widget_settings.shop_id is
  'Boutique fixe. NULL signifie que la configuration publiée peut proposer plusieurs boutiques.';
comment on column public.widget_settings.published_config is
  'Copie de la configuration publique active. Ne doit contenir aucune donnée commerciale interne.';

-- ---------------------------------------------------------------------------
-- Historique immuable des publications.
-- ---------------------------------------------------------------------------

create table public.widget_versions (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null,
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  version integer not null,
  configuration jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  status text not null default 'draft',
  restored_from_version integer,
  constraint widget_versions_widget_tenant_fk
    foreign key (tenant_id, widget_id)
    references public.widget_settings(tenant_id, id) on delete cascade,
  constraint widget_versions_created_by_tenant_fk
    foreign key (tenant_id, created_by)
    references public.team_members(workshop_id, id) on delete set null (created_by),
  constraint widget_versions_widget_version_key unique (widget_id, version),
  constraint widget_versions_tenant_id_id_key unique (tenant_id, id),
  constraint widget_versions_version_check check (version > 0),
  constraint widget_versions_configuration_object check (jsonb_typeof(configuration) = 'object'),
  constraint widget_versions_status_check check (status in ('draft', 'published', 'superseded', 'restored', 'archived')),
  constraint widget_versions_publish_state_check check (
    (status = 'draft' and published_at is null)
    or (status <> 'draft' and published_at is not null)
  ),
  constraint widget_versions_restore_check check (
    restored_from_version is null or restored_from_version > 0
  )
);

-- ---------------------------------------------------------------------------
-- Demandes : réutilisent clients, appointments et repairs existants.
-- L'absence de customer_id est autorisée le temps d'une validation en cas de
-- correspondances multiples, mais un moyen de contact normalisé est requis.
-- ---------------------------------------------------------------------------

create table public.widget_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  shop_id uuid not null,
  widget_id uuid not null,
  widget_version integer not null,
  customer_id uuid,
  appointment_id uuid,
  repair_case_id uuid,
  lead_type text not null,
  first_name text,
  last_name text,
  phone text,
  phone_normalized text,
  email text,
  email_normalized text,
  device_category text not null,
  brand text,
  model text not null,
  issue text not null,
  issue_description text,
  service_label text,
  quality_label text,
  displayed_price numeric(12,2),
  displayed_price_snapshot jsonb,
  displayed_stock text,
  displayed_stock_snapshot jsonb,
  displayed_duration_minutes integer,
  displayed_warranty text,
  comment text,
  photos jsonb not null default '[]'::jsonb,
  contact_preference text,
  requested_callback_at timestamptz,
  source_url text,
  status text not null default 'new',
  assigned_to uuid,
  consent jsonb not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint widget_leads_shop_tenant_fk
    foreign key (tenant_id, shop_id)
    references public.shops(tenant_id, id) on delete restrict,
  constraint widget_leads_widget_tenant_fk
    foreign key (tenant_id, widget_id)
    references public.widget_settings(tenant_id, id) on delete restrict,
  constraint widget_leads_published_version_fk
    foreign key (widget_id, widget_version)
    references public.widget_versions(widget_id, version) on delete restrict,
  constraint widget_leads_customer_tenant_fk
    foreign key (tenant_id, customer_id)
    references public.clients(workshop_id, id) on delete set null (customer_id),
  constraint widget_leads_appointment_tenant_fk
    foreign key (tenant_id, appointment_id)
    references public.appointments(workshop_id, id) on delete set null (appointment_id),
  constraint widget_leads_repair_tenant_fk
    foreign key (tenant_id, repair_case_id)
    references public.repairs(workshop_id, id) on delete set null (repair_case_id),
  constraint widget_leads_assigned_to_tenant_fk
    foreign key (tenant_id, assigned_to)
    references public.team_members(workshop_id, id) on delete set null (assigned_to),
  constraint widget_leads_widget_idempotency_key unique (widget_id, idempotency_key),
  constraint widget_leads_tenant_id_id_key unique (tenant_id, id),
  constraint widget_leads_widget_version_check check (widget_version > 0),
  constraint widget_leads_type_check check (lead_type in ('callback', 'quote', 'price_request', 'appointment')),
  constraint widget_leads_status_check check (
    status in (
      'new',
      'to_contact',
      'contacted',
      'waiting_customer',
      'converted_appointment',
      'converted_quote',
      'converted_repair',
      'closed',
      'spam'
    )
  ),
  constraint widget_leads_contact_preference_check check (
    contact_preference is null or contact_preference in ('phone', 'sms', 'email', 'whatsapp')
  ),
  constraint widget_leads_phone_normalized_check check (
    phone_normalized is null or phone_normalized ~ '^\+[1-9][0-9]{6,14}$'
  ),
  constraint widget_leads_email_normalized_check check (
    email_normalized is null or email_normalized = lower(btrim(email_normalized))
  ),
  constraint widget_leads_contact_required check (
    nullif(btrim(coalesce(phone_normalized, '')), '') is not null
    or nullif(btrim(coalesce(email_normalized, '')), '') is not null
  ),
  constraint widget_leads_price_nonnegative check (displayed_price is null or displayed_price >= 0),
  constraint widget_leads_duration_positive check (
    displayed_duration_minutes is null or displayed_duration_minutes > 0
  ),
  constraint widget_leads_photos_array check (jsonb_typeof(photos) = 'array'),
  constraint widget_leads_consent_object check (jsonb_typeof(consent) = 'object'),
  constraint widget_leads_price_snapshot_object check (
    displayed_price_snapshot is null or jsonb_typeof(displayed_price_snapshot) = 'object'
  ),
  constraint widget_leads_stock_snapshot_object check (
    displayed_stock_snapshot is null or jsonb_typeof(displayed_stock_snapshot) = 'object'
  ),
  constraint widget_leads_idempotency_key_length check (
    char_length(idempotency_key) between 12 and 160
  )
);

comment on column public.widget_leads.displayed_price_snapshot is
  'Instantané public : type de prix, devise, qualité et version. Aucun coût, fournisseur ou marge.';
comment on column public.widget_leads.displayed_stock_snapshot is
  'Instantané public agrégé. Aucun lot, facture fournisseur, coût ou référence interne.';
comment on column public.widget_leads.consent is
  'Texte/version acceptés, date, finalité de service et consentement marketing séparé.';

-- Le rendez-vous existant reste la source métier. On ajoute uniquement ses
-- liens vers le widget et les indicateurs de confirmation nécessaires.
alter table public.appointments
  add column if not exists shop_id uuid,
  add column if not exists source_id uuid,
  add column if not exists widget_id uuid,
  add column if not exists widget_lead_id uuid,
  add column if not exists widget_version integer,
  add column if not exists confirmation_status text not null default 'pending',
  add column if not exists stock_confirmation_required boolean not null default false,
  add column if not exists price_confirmation_required boolean not null default false,
  add column if not exists idempotency_key text;

alter table public.appointments
  add constraint appointments_shop_tenant_fk
    foreign key (workshop_id, shop_id)
    references public.shops(tenant_id, id) on delete restrict,
  add constraint appointments_widget_tenant_fk
    foreign key (workshop_id, widget_id)
    references public.widget_settings(tenant_id, id) on delete set null (widget_id),
  add constraint appointments_widget_lead_tenant_fk
    foreign key (workshop_id, widget_lead_id)
    references public.widget_leads(tenant_id, id) on delete set null (widget_lead_id),
  add constraint appointments_widget_version_fk
    foreign key (widget_id, widget_version)
    references public.widget_versions(widget_id, version) on delete restrict,
  add constraint appointments_confirmation_status_check
    check (confirmation_status in ('pending', 'confirmed', 'cancelled', 'rescheduled'));

-- ---------------------------------------------------------------------------
-- Analytics sans PII. event_payload est limité à des métadonnées techniques
-- ou des identifiants publics ; l'API rejettera toute coordonnée personnelle.
-- ---------------------------------------------------------------------------

create table public.widget_events (
  id bigint generated by default as identity primary key,
  tenant_id uuid not null references public.workshops(id) on delete cascade,
  shop_id uuid,
  widget_id uuid not null,
  widget_version integer not null,
  anonymous_session_id text not null,
  event_name text not null,
  event_payload jsonb not null default '{}'::jsonb,
  idempotency_key text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint widget_events_shop_tenant_fk
    foreign key (tenant_id, shop_id)
    references public.shops(tenant_id, id) on delete restrict,
  constraint widget_events_widget_tenant_fk
    foreign key (tenant_id, widget_id)
    references public.widget_settings(tenant_id, id) on delete cascade,
  constraint widget_events_published_version_fk
    foreign key (widget_id, widget_version)
    references public.widget_versions(widget_id, version) on delete restrict,
  constraint widget_events_version_check check (widget_version > 0),
  constraint widget_events_name_check check (
    event_name in (
      'widget_loaded',
      'widget_started',
      'device_selected',
      'issue_selected',
      'price_displayed',
      'price_unavailable',
      'stock_displayed',
      'stock_unavailable',
      'form_opened',
      'lead_submitted',
      'booking_opened',
      'slot_selected',
      'appointment_created',
      'widget_abandoned'
    )
  ),
  constraint widget_events_payload_object check (jsonb_typeof(event_payload) = 'object'),
  constraint widget_events_session_length check (
    char_length(anonymous_session_id) between 12 and 160
  )
);

-- ---------------------------------------------------------------------------
-- Indexes de résolution, listes SaaS, déduplication et statistiques.
-- ---------------------------------------------------------------------------

create index idx_shops_tenant_active
  on public.shops (tenant_id, active);

create index idx_widget_settings_tenant_active
  on public.widget_settings (tenant_id, active);

create index idx_widget_settings_shop
  on public.widget_settings (tenant_id, shop_id)
  where shop_id is not null;

create index idx_widget_versions_widget_created
  on public.widget_versions (widget_id, created_at desc);

create index idx_widget_versions_tenant_status
  on public.widget_versions (tenant_id, status, published_at desc);

create index idx_widget_versions_created_by
  on public.widget_versions (tenant_id, created_by, created_at desc)
  where created_by is not null;

create unique index idx_widget_versions_one_published
  on public.widget_versions (widget_id)
  where status = 'published';

create index idx_widget_leads_tenant_created
  on public.widget_leads (tenant_id, created_at desc);

create index idx_widget_leads_shop_status_created
  on public.widget_leads (shop_id, status, created_at desc);

create index idx_widget_leads_widget_status_created
  on public.widget_leads (widget_id, status, created_at desc);

create index idx_widget_leads_widget_version
  on public.widget_leads (widget_id, widget_version, created_at desc);

create index idx_widget_leads_phone_normalized
  on public.widget_leads (tenant_id, phone_normalized)
  where phone_normalized is not null and phone_normalized <> '';

create index idx_widget_leads_email_normalized
  on public.widget_leads (tenant_id, email_normalized)
  where email_normalized is not null and email_normalized <> '';

create index idx_widget_leads_customer
  on public.widget_leads (tenant_id, customer_id, created_at desc)
  where customer_id is not null;

create index idx_widget_leads_appointment
  on public.widget_leads (appointment_id)
  where appointment_id is not null;

create index idx_widget_leads_repair_case
  on public.widget_leads (repair_case_id)
  where repair_case_id is not null;

create index idx_widget_leads_assigned_to
  on public.widget_leads (tenant_id, assigned_to, created_at desc)
  where assigned_to is not null;

create index idx_clients_phone_normalized
  on public.clients (workshop_id, phone_normalized)
  where phone_normalized <> '';

create index idx_clients_email_normalized
  on public.clients (workshop_id, email_normalized)
  where email_normalized <> '';

create unique index idx_appointments_widget_idempotency
  on public.appointments (widget_id, idempotency_key)
  where widget_id is not null and idempotency_key is not null;

create index idx_appointments_widget_lead
  on public.appointments (widget_lead_id)
  where widget_lead_id is not null;

create index idx_appointments_widget
  on public.appointments (widget_id, widget_version, appointment_date, appointment_time)
  where widget_id is not null;

create index idx_appointments_shop_slot
  on public.appointments (shop_id, appointment_date, appointment_time, status)
  where shop_id is not null;

create index idx_widget_events_widget_occurred
  on public.widget_events (widget_id, occurred_at desc);

create index idx_widget_events_tenant_name_occurred
  on public.widget_events (tenant_id, event_name, occurred_at desc);

create index idx_widget_events_shop_occurred
  on public.widget_events (shop_id, occurred_at desc)
  where shop_id is not null;

create index idx_widget_events_session
  on public.widget_events (widget_id, anonymous_session_id, occurred_at);

create unique index idx_widget_events_idempotency
  on public.widget_events (widget_id, idempotency_key)
  where idempotency_key is not null;

-- ---------------------------------------------------------------------------
-- updated_at : réutilisation de la fonction existante touch_updated_at().
-- ---------------------------------------------------------------------------

create trigger trg_shops_touch
  before update on public.shops
  for each row execute function public.touch_updated_at();

create trigger trg_widget_settings_touch
  before update on public.widget_settings
  for each row execute function public.touch_updated_at();

create trigger trg_widget_leads_touch
  before update on public.widget_leads
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Sécurité : aucune lecture/écriture directe depuis le navigateur.
-- Les policies explicites false documentent et testent ce choix. Le service
-- role utilisé uniquement côté serveur conserve son comportement bypass RLS.
-- ---------------------------------------------------------------------------

alter table public.shops enable row level security;
alter table public.widget_settings enable row level security;
alter table public.widget_versions enable row level security;
alter table public.widget_leads enable row level security;
alter table public.widget_events enable row level security;

revoke all on table public.shops from anon, authenticated;
revoke all on table public.widget_settings from anon, authenticated;
revoke all on table public.widget_versions from anon, authenticated;
revoke all on table public.widget_leads from anon, authenticated;
revoke all on table public.widget_events from anon, authenticated;
revoke all on sequence public.widget_events_id_seq from anon, authenticated;

create policy "shops_deny_anon"
  on public.shops for all to anon
  using (false) with check (false);
create policy "shops_deny_authenticated"
  on public.shops for all to authenticated
  using (false) with check (false);

create policy "widget_settings_deny_anon"
  on public.widget_settings for all to anon
  using (false) with check (false);
create policy "widget_settings_deny_authenticated"
  on public.widget_settings for all to authenticated
  using (false) with check (false);

create policy "widget_versions_deny_anon"
  on public.widget_versions for all to anon
  using (false) with check (false);
create policy "widget_versions_deny_authenticated"
  on public.widget_versions for all to authenticated
  using (false) with check (false);

create policy "widget_leads_deny_anon"
  on public.widget_leads for all to anon
  using (false) with check (false);
create policy "widget_leads_deny_authenticated"
  on public.widget_leads for all to authenticated
  using (false) with check (false);

create policy "widget_events_deny_anon"
  on public.widget_events for all to anon
  using (false) with check (false);
create policy "widget_events_deny_authenticated"
  on public.widget_events for all to authenticated
  using (false) with check (false);

grant all on table public.shops to service_role;
grant all on table public.widget_settings to service_role;
grant all on table public.widget_versions to service_role;
grant all on table public.widget_leads to service_role;
grant all on table public.widget_events to service_role;
grant usage, select on sequence public.widget_events_id_seq to service_role;

comment on table public.widget_events is
  'Événements analytiques sans PII. Toute écriture passe par l API publique validée.';
