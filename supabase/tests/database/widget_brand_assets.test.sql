begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table('public', 'widget_assets', 'widget asset registry exists');
select has_column('public', 'widget_assets', 'target_key', 'asset target is retained');
select has_column('public', 'widget_assets', 'public_url', 'public CDN URL is retained');
select has_column('public', 'widget_assets', 'byte_size', 'optimized size is retained');
select has_column('public', 'widget_assets', 'width', 'optimized width is retained');
select has_column('public', 'widget_assets', 'height', 'optimized height is retained');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.widget_assets'::regclass),
  'RLS protects the asset registry'
);
select ok(not has_table_privilege('anon', 'public.widget_assets', 'select'), 'anon cannot enumerate widget assets');
select has_index('public', 'widget_assets', 'idx_widget_assets_widget_created', 'widget asset listing is indexed');
select ok(
  exists (
    select 1 from storage.buckets
    where id = 'widget-brand-assets'
      and public
      and file_size_limit = 524288
      and allowed_mime_types @> array['image/webp', 'image/png', 'image/jpeg']
  ),
  'public branding bucket restricts size and MIME types'
);

select * from finish();
rollback;
