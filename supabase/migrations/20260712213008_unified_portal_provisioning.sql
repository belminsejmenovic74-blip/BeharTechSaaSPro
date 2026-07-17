-- Provisionnement complet et idempotent du portail client.
-- Chaque atelier obtient immédiatement sa licence, ses modèles de communication,
-- sa boutique et un widget publié utilisable, sans ouverture préalable du SaaS.

alter table public.subscriptions
  add column if not exists requested_plan text not null default 'free'
    check (requested_plan in ('free', 'starter', 'pro', 'business')),
  add column if not exists billing_interval text not null default 'month'
    check (billing_interval in ('month', 'year'));

create or replace function private.ensure_workshop_portal(p_workshop_id uuid, p_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workshop public.workshops%rowtype;
  v_user auth.users%rowtype;
  v_shop_id uuid;
  v_widget_id uuid;
  v_license_key text;
  v_requested_plan text := 'free';
  v_interval text := 'month';
  v_config jsonb;
begin
  select * into v_workshop from public.workshops where id = p_workshop_id;
  if v_workshop.id is null then return; end if;

  if p_user_id is not null then
    select * into v_user from auth.users where id = p_user_id;
    if lower(coalesce(v_user.raw_user_meta_data ->> 'selected_plan', 'free')) in ('free','starter','pro','business') then
      v_requested_plan := lower(coalesce(v_user.raw_user_meta_data ->> 'selected_plan', 'free'));
    end if;
    if lower(coalesce(v_user.raw_user_meta_data ->> 'billing_interval', 'month')) in ('month','year') then
      v_interval := lower(coalesce(v_user.raw_user_meta_data ->> 'billing_interval', 'month'));
    end if;
  end if;

  update public.subscriptions
  set requested_plan = v_requested_plan,
      billing_interval = v_interval,
      updated_at = now()
  where workshop_id = p_workshop_id;

  insert into public.communication_settings(
    workshop_id, sms_templates, email_templates, sender_name, reply_to,
    email_signature, brand_color, automations
  ) values (
    p_workshop_id,
    jsonb_build_object(
      'repair_received', 'Bonjour {{client}}, votre {{appareil}} a bien été pris en charge par {{atelier}}. Dossier {{dossier}}.',
      'diagnosis_ready', 'Bonjour {{client}}, le diagnostic de votre {{appareil}} est terminé. Consultez votre suivi : {{lien_suivi}}',
      'repair_ready', 'Bonne nouvelle {{client}} : votre {{appareil}} est prêt à être récupéré chez {{atelier}}.',
      'review_request', 'Merci pour votre confiance. N''hésitez pas à nous laisser 5 étoiles : {{lien_avis}}'
    ),
    jsonb_build_object(
      'repair_received_subject', 'Votre appareil a bien été pris en charge',
      'repair_received_body', 'Bonjour {{client}},\n\nNous avons bien pris en charge votre {{appareil}} sous le dossier {{dossier}}.\n\nSuivez son avancement ici : {{lien_suivi}}',
      'repair_ready_subject', 'Votre appareil est prêt',
      'repair_ready_body', 'Bonjour {{client}},\n\nVotre {{appareil}} est prêt à être récupéré chez {{atelier}}.\n\nMerci pour votre confiance.',
      'review_subject', 'Votre avis compte pour nous',
      'review_body', 'Merci d''avoir choisi {{atelier}}. N''hésitez pas à nous laisser 5 étoiles : {{lien_avis}}'
    ),
    coalesce(v_workshop.commercial_name, v_workshop.name),
    nullif(v_workshop.email, ''),
    'L''équipe ' || coalesce(v_workshop.commercial_name, v_workshop.name),
    '#2A9D8F',
    '{"repair_received":{"sms":true,"email":true},"repair_ready":{"sms":true,"email":true},"review_request":{"sms":false,"email":false}}'::jsonb
  ) on conflict (workshop_id) do nothing;

  insert into public.document_settings(workshop_id, legal_mentions, terms, warranty)
  values (p_workshop_id, v_workshop.legal_mentions, v_workshop.warranty_terms, v_workshop.warranty_terms)
  on conflict (workshop_id) do nothing;

  select id into v_shop_id
  from public.shops
  where tenant_id = p_workshop_id
  order by created_at
  limit 1;

  if v_shop_id is null then
    insert into public.shops(
      tenant_id, internal_name, commercial_name, active, timezone,
      address_config, schedule_config
    ) values (
      p_workshop_id,
      coalesce(nullif(v_workshop.commercial_name, ''), v_workshop.name, 'Boutique principale'),
      coalesce(nullif(v_workshop.commercial_name, ''), v_workshop.name),
      true,
      'Europe/Paris',
      jsonb_build_object(
        'address', v_workshop.address,
        'postalCode', v_workshop.postal_code,
        'city', v_workshop.city,
        'country', v_workshop.country
      ),
      jsonb_build_object('businessHours', coalesce(v_workshop.business_hours, ''))
    ) returning id into v_shop_id;
  end if;

  v_config := jsonb_build_object(
    'internalName', 'Widget client principal',
    'active', true,
    'displayMode', 'inline',
    'general', jsonb_build_object(
      'commercialName', coalesce(nullif(v_workshop.commercial_name, ''), v_workshop.name, 'Mon atelier'),
      'phone', coalesce(v_workshop.phone, ''),
      'address', concat_ws(', ', nullif(v_workshop.address, ''), nullif(concat_ws(' ', v_workshop.postal_code, v_workshop.city), '')),
      'locale', case when v_workshop.country = 'CH' then 'fr-CH' else 'fr-FR' end,
      'currency', case when v_workshop.country = 'CH' then 'CHF' else 'EUR' end,
      'privacyUrl', ''
    ),
    'visual', jsonb_build_object(
      'primaryColor', '#2A9D8F', 'buttonColor', '#2A9D8F', 'buttonTextColor', '#FFFFFF',
      'textColor', '#1A1916', 'backgroundColor', '#FFFFFF', 'radius', 14,
      'logoUrl', '', 'backgroundStyle', 'plain', 'buttonStyle', 'solid',
      'headingSize', 'medium', 'textSize', 'medium', 'contentWidth', 'standard'
    ),
    'texts', jsonb_build_object(
      'title', 'Réparez votre appareil',
      'introduction', 'Recherchez d’abord le type d’appareil, la marque et le modèle, puis complétez votre demande.',
      'deviceTitle', 'Quel appareil souhaitez-vous réparer ?',
      'issueTitle', 'Quel problème rencontrez-vous ?',
      'resultTitle', 'Votre solution de réparation',
      'contactTitle', 'Finalisez votre demande',
      'bookingTitle', 'Choisissez un rendez-vous',
      'firstNameLabel', 'Prénom', 'lastNameLabel', 'Nom', 'phoneLabel', 'Téléphone',
      'emailLabel', 'E-mail', 'contactPreferenceLabel', 'Préférence de contact',
      'commentLabel', 'Précisions utiles', 'requestTypeLabel', 'Votre besoin',
      'photoLabel', 'Photos de l’appareil',
      'consentLabel', 'J’accepte d’être contacté au sujet de cette demande.',
      'submitLabel', 'Envoyer ma demande', 'callbackLabel', 'Être rappelé',
      'quoteLabel', 'Demander un devis', 'bookingLabel', 'Prendre rendez-vous'
    ),
    'features', jsonb_build_object(
      'deviceSearch', true, 'priceEstimate', true, 'stockAvailability', false,
      'duration', true, 'quoteRequest', true, 'callbackRequest', true,
      'booking', true, 'shopChoice', false, 'qualityChoice', true,
      'multiIssue', true, 'comment', true, 'photos', true,
      'warranty', true, 'payments', false
    ),
    'catalogPolicy', jsonb_build_object(
      'allowOutOfCatalog', true, 'allowUnconfiguredModels', true,
      'allowUnconfiguredIssues', true, 'allowOutOfCatalogAppointments', true,
      'fallbackMode', 'quote'
    ),
    'layout', jsonb_build_object(
      'blockOrder', jsonb_build_array('header','progress','content','actions'),
      'hiddenBlocks', '[]'::jsonb,
      'fieldOrder', jsonb_build_array('identity','contact','preference','comment','photos','request','booking','consent'),
      'hiddenFields', '[]'::jsonb, 'columns', 1, 'alignment', 'left', 'template', 'classic'
    ),
    'icons', '{}'::jsonb,
    'offers', jsonb_build_object(
      'enabled', true,
      'title', 'Offres et avantages',
      'subtitle', 'Ajoutez une option à votre réparation',
      'introduction', 'Sélectionnez uniquement ce qui vous intéresse.',
      'layout', 'grid',
      'columns', 2,
      'offers', jsonb_build_array(
        jsonb_build_object('id', 'qualirepar', 'title', 'Bonus QualiRépar', 'description', 'Jusqu’à 25 € de remise sur une réparation éligible.', 'conditionText', 'Éligibilité confirmée en boutique', 'displayMode', 'icon', 'behavior', 'selectable', 'fixedDiscount', 25, 'isPublished', true, 'displayOrder', 0),
        jsonb_build_object('id', 'verre-trempe', 'title', 'Verre trempé premium', 'description', 'Protection posée en boutique.', 'conditionText', 'Compatible selon le modèle', 'displayMode', 'icon', 'behavior', 'selectable', 'originalPrice', 20, 'promotionalPrice', 10, 'isPublished', true, 'displayOrder', 1)
      )
    )
  );

  select id into v_widget_id
  from public.widget_settings
  where tenant_id = p_workshop_id
  order by created_at
  limit 1;

  if v_widget_id is null then
    insert into public.widget_settings(
      tenant_id, shop_id, internal_name, active, display_mode,
      general_config, visual_config, text_config, field_config, step_config,
      draft_config, published_config, published_version, published_at
    ) values (
      p_workshop_id, v_shop_id, 'Widget client principal', true, 'inline',
      v_config->'general', v_config->'visual', v_config->'texts',
      v_config->'features', v_config->'layout', v_config, v_config, 1, now()
    ) returning id into v_widget_id;

    insert into public.widget_versions(widget_id, tenant_id, version, configuration, published_at, status)
    values (v_widget_id, p_workshop_id, 1, v_config, now(), 'published');
  end if;

  select s.license_key into v_license_key
  from public.license_keys l
  join private.license_secrets s on s.license_id = l.id
  where l.workshop_id = p_workshop_id
  limit 1;

  if p_user_id is not null and v_license_key is not null then
    insert into public.workshop_owners(user_id, license_key)
    values (p_user_id, v_license_key)
    on conflict (user_id) do update set license_key = excluded.license_key;
  end if;
end;
$$;

revoke all on function private.ensure_workshop_portal(uuid, uuid) from public, anon, authenticated;

create or replace function private.handle_workshop_portal_provisioning()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' then
    perform private.ensure_workshop_portal(new.workshop_id, new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function private.handle_workshop_portal_provisioning() from public, anon, authenticated;

drop trigger if exists provision_workshop_portal on public.organization_members;
create trigger provision_workshop_portal
after insert or update of status on public.organization_members
for each row execute function private.handle_workshop_portal_provisioning();

create or replace function private.handle_license_portal_provisioning()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if new.workshop_id is null then return new; end if;
  select user_id into v_user_id
  from public.organization_members
  where workshop_id = new.workshop_id and status = 'active'
  order by (role = 'owner') desc, created_at
  limit 1;
  perform private.ensure_workshop_portal(new.workshop_id, v_user_id);
  return new;
end;
$$;

revoke all on function private.handle_license_portal_provisioning() from public, anon, authenticated;

drop trigger if exists provision_portal_after_license on public.license_keys;
create trigger provision_portal_after_license
after insert or update of workshop_id on public.license_keys
for each row execute function private.handle_license_portal_provisioning();

do $$
declare m record;
begin
  for m in
    select distinct on (workshop_id) workshop_id, user_id
    from public.organization_members
    where status = 'active'
    order by workshop_id, (role = 'owner') desc, created_at
  loop
    perform private.ensure_workshop_portal(m.workshop_id, m.user_id);
  end loop;
end;
$$;
