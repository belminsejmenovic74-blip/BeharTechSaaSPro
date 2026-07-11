-- Publication atomique du mini-CMS widget. L'API interne prépare et valide la
-- configuration ; cette fonction sérialise les publications et conserve une
-- version restaurable sans fenêtre où deux versions seraient « published ».

create or replace function public.publish_widget_config(
  p_tenant_id uuid,
  p_widget_id uuid,
  p_configuration jsonb,
  p_display_mode text,
  p_internal_name text,
  p_active boolean default true,
  p_created_by uuid default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_widget public.widget_settings%rowtype;
  v_version integer;
begin
  if jsonb_typeof(p_configuration) <> 'object' then
    raise exception 'widget configuration must be an object';
  end if;
  if p_display_mode not in ('inline', 'modal', 'floating') then
    raise exception 'invalid widget display mode';
  end if;

  select * into v_widget
  from public.widget_settings
  where tenant_id = p_tenant_id and id = p_widget_id
  for update;
  if v_widget.id is null then raise exception 'widget not found'; end if;

  v_version := v_widget.published_version + 1;
  update public.widget_versions
  set status = 'superseded'
  where widget_id = p_widget_id and status = 'published';

  insert into public.widget_versions (
    widget_id, tenant_id, version, configuration, created_by,
    published_at, status
  ) values (
    p_widget_id, p_tenant_id, v_version, p_configuration, p_created_by,
    now(), 'published'
  );

  update public.widget_settings
  set internal_name = left(btrim(p_internal_name), 160),
      active = p_active,
      display_mode = p_display_mode,
      general_config = coalesce(p_configuration->'general', '{}'::jsonb),
      visual_config = coalesce(p_configuration->'visual', '{}'::jsonb),
      text_config = coalesce(p_configuration->'texts', '{}'::jsonb),
      icon_config = coalesce(p_configuration->'icons', '{}'::jsonb),
      field_config = coalesce(p_configuration->'features', '{}'::jsonb),
      step_config = coalesce(p_configuration->'layout', '{}'::jsonb),
      draft_config = p_configuration,
      published_config = p_configuration,
      published_version = v_version,
      published_at = now()
  where tenant_id = p_tenant_id and id = p_widget_id;

  return jsonb_build_object(
    'widgetId', p_widget_id,
    'version', v_version,
    'publishedAt', now(),
    'active', p_active
  );
end;
$$;

revoke all on function public.publish_widget_config(uuid, uuid, jsonb, text, text, boolean, uuid) from public;
revoke all on function public.publish_widget_config(uuid, uuid, jsonb, text, text, boolean, uuid) from anon, authenticated;
grant execute on function public.publish_widget_config(uuid, uuid, jsonb, text, text, boolean, uuid) to service_role;

comment on function public.publish_widget_config(uuid, uuid, jsonb, text, text, boolean, uuid) is
  'Publie atomiquement une configuration CMS validée et archive la version précédente.';
