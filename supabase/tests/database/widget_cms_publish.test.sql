begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select has_function(
  'public',
  'publish_widget_config',
  array['uuid', 'uuid', 'jsonb', 'text', 'text', 'boolean', 'uuid'],
  'atomic CMS publication function exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.publish_widget_config(uuid,uuid,jsonb,text,text,boolean,uuid)',
    'execute'
  ),
  'anon cannot publish a widget'
);

insert into public.workshops (id, name)
values ('20000000-0000-4000-a000-000000000001', 'CMS test');
insert into public.shops (id, tenant_id, public_shop_id, internal_name)
values (
  '20000000-0000-4000-a000-000000000002',
  '20000000-0000-4000-a000-000000000001',
  'shop_cms_test_123456',
  'Boutique CMS'
);
insert into public.widget_settings (
  id, tenant_id, shop_id, public_widget_id, internal_name, active,
  display_mode, draft_config
) values (
  '20000000-0000-4000-a000-000000000003',
  '20000000-0000-4000-a000-000000000001',
  '20000000-0000-4000-a000-000000000002',
  'wdg_cms_test_123456',
  'Widget CMS',
  true,
  'inline',
  '{}'::jsonb
);

select is(
  (public.publish_widget_config(
    '20000000-0000-4000-a000-000000000001',
    '20000000-0000-4000-a000-000000000003',
    '{"general":{"commercialName":"Version 1"},"layout":{"columns":1}}'::jsonb,
    'inline', 'Widget CMS', true, null
  )->>'version')::integer,
  1,
  'first publication creates version one'
);
select is(
  (select published_version from public.widget_settings where id = '20000000-0000-4000-a000-000000000003'),
  1,
  'settings point to version one'
);

select is(
  (public.publish_widget_config(
    '20000000-0000-4000-a000-000000000001',
    '20000000-0000-4000-a000-000000000003',
    '{"general":{"commercialName":"Version 2"},"layout":{"columns":2}}'::jsonb,
    'modal', 'Widget CMS modifié', true, null
  )->>'version')::integer,
  2,
  'second publication creates version two'
);
select is(
  (select count(*) from public.widget_versions where widget_id = '20000000-0000-4000-a000-000000000003'),
  2::bigint,
  'both versions are retained'
);
select is(
  (select status from public.widget_versions where widget_id = '20000000-0000-4000-a000-000000000003' and version = 1),
  'superseded',
  'previous version is archived atomically'
);
select ok(
  (select display_mode = 'modal'
      and published_config->'layout'->>'columns' = '2'
      and draft_config = published_config
   from public.widget_settings
   where id = '20000000-0000-4000-a000-000000000003'),
  'published settings and draft stay aligned'
);

select * from finish();
rollback;
