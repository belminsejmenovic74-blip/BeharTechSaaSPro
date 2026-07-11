begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

select has_table('public', 'stock_commitments', 'stock commitments table exists');
select has_table('public', 'widget_stock_publications', 'widget stock publication table exists');
select has_column('public', 'stock_items', 'physical_quantity', 'physical stock is stored separately');
select has_column('public', 'stock_items', 'source_shop_key', 'stock keeps its source shop');
select has_column('public', 'stock_items', 'sellable_status', 'stock has an explicit sellable status');

insert into public.workshops (id, name)
values ('81000000-0000-4000-8000-000000000001', 'Atelier test stock widget');

insert into public.shops (id, tenant_id, public_shop_id, internal_name)
values (
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'shop_stocktest000001',
  'Boutique stock'
);

insert into public.widget_settings (id, tenant_id, shop_id, public_widget_id, internal_name)
values (
  '83000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  'wdg_stocktest00000001',
  'Widget stock'
);

insert into public.stock_items (
  id, workshop_id, sku, internal_code, canonical_reference, scan_token,
  name, quality, quantity, physical_quantity, source_shop_key,
  storage_location, sellable_status, active, repair_enabled
) values
  ('84000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'SUP-A', 'PCE-TST1-001', 'SCREEN-IP13', 'sp_TESTSTOCK000000000000000001', 'Écran lot A', 'OLED', 2, 5, 'shop-local-a', 'A-01', 'sellable', true, true),
  ('84000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000001', 'SUP-B', 'PCE-TST1-002', 'SCREEN-IP13', 'sp_TESTSTOCK000000000000000002', 'Écran lot B', 'OLED', 3, 4, 'shop-local-a', 'B-09', 'sellable', true, true),
  ('84000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000001', 'OTHER-SHOP', 'PCE-TST1-003', 'SCREEN-IP13', 'sp_TESTSTOCK000000000000000003', 'Autre boutique', 'OLED', 100, 100, 'shop-local-b', 'C-01', 'sellable', true, true),
  ('84000000-0000-4000-8000-000000000004', '81000000-0000-4000-8000-000000000001', 'OTHER-QUALITY', 'PCE-TST1-004', 'SCREEN-IP13', 'sp_TESTSTOCK000000000000000004', 'Autre qualité', 'LCD', 100, 100, 'shop-local-a', 'C-02', 'sellable', true, true),
  ('84000000-0000-4000-8000-000000000005', '81000000-0000-4000-8000-000000000001', 'BLOCKED', 'PCE-TST1-005', 'SCREEN-IP13', 'sp_TESTSTOCK000000000000000005', 'Non vendable', 'OLED', 100, 100, 'shop-local-a', 'Q-01', 'quarantine', true, true),
  ('84000000-0000-4000-8000-000000000006', '81000000-0000-4000-8000-000000000001', 'ZERO', 'PCE-TST1-006', 'BATTERY-IP13', 'sp_TESTSTOCK000000000000000006', 'Batterie zéro', 'OEM', 0, 0, 'shop-local-a', 'A-02', 'sellable', true, true),
  ('84000000-0000-4000-8000-000000000007', '81000000-0000-4000-8000-000000000001', 'NEG', 'PCE-TST1-007', 'CAMERA-IP13', 'sp_TESTSTOCK000000000000000007', 'Caméra négative', 'OEM', -3, -3, 'shop-local-a', 'A-03', 'sellable', true, true);

insert into public.stock_commitments (
  tenant_id, stock_item_id, source_shop_key, commitment_type, quantity, source_id
) values
  ('81000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', 'shop-local-a', 'reservation', 2, 'repair-reservation-1'),
  ('81000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000002', 'shop-local-a', 'repair_allocation', 1, 'repair-allocation-1'),
  ('81000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000002', 'shop-local-a', 'transfer_out', 1, 'transfer-pending-1');

insert into public.suppliers (id, workshop_id, name) values
  ('85000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'Fournisseur A'),
  ('85000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000001', 'Fournisseur B');

insert into public.supplier_invoices (
  id, workshop_id, supplier_id, supplier_name, invoice_number
) values
  ('86000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', 'Fournisseur A', 'INV-STOCK-A'),
  ('86000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000002', 'Fournisseur B', 'INV-STOCK-B');

insert into public.supplier_invoice_lines (
  id, workshop_id, supplier_invoice_id, stock_item_id, item_name,
  quantity_purchased, unit_purchase_price_ht, line_total_ht, invoice_id
) values
  ('87000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', 'Lot A', 5, 10, 50, '86000000-0000-4000-8000-000000000001'),
  ('87000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000002', '84000000-0000-4000-8000-000000000002', 'Lot B', 4, 12, 48, '86000000-0000-4000-8000-000000000002');

select is(
  (select count(*)::integer from public.supplier_invoice_lines where workshop_id = '81000000-0000-4000-8000-000000000001'),
  2,
  'multiple supplier invoices are present without being exposed'
);

insert into public.widget_stock_publications (
  tenant_id, widget_id, shop_id, service_public_id, canonical_reference,
  quality, source_shop_key, publication_mode, exact_quantity_enabled,
  delay_days, published
) values
  ('81000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'svc_screen', 'SCREEN-IP13', 'OLED', 'shop-local-a', 'quantity', true, null, true),
  ('81000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'svc_zero', 'BATTERY-IP13', 'OEM', 'shop-local-a', 'status', false, null, true),
  ('81000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'svc_negative', 'CAMERA-IP13', 'OEM', 'shop-local-a', 'quantity', true, null, true),
  ('81000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'svc_delay', 'UNKNOWN', 'OEM', 'shop-local-a', 'delay', false, 3, true),
  ('81000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'svc_unpublished', 'SCREEN-IP13', 'OLED', 'shop-local-a', 'status', false, null, false);

select is(
  (public.widget_public_stock_availability(
    '81000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    'svc_screen'
  )->>'quantity')::numeric,
  5::numeric,
  'physical stock from multiple lots minus reservation, allocation and transfer equals five'
);

select ok(
  public.widget_public_stock_availability(
    '81000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    'svc_screen'
  ) ?& array['mode', 'status', 'quantity']
  and not public.widget_public_stock_availability(
    '81000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    'svc_screen'
  ) ?| array['supplier', 'invoice', 'lot', 'purchase_price', 'location', 'notes'],
  'public result contains no internal commercial or location data'
);

select is(
  public.widget_public_stock_availability('81000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'svc_zero')->>'status',
  'out',
  'zero stock is unavailable'
);

select is(
  (public.widget_public_stock_availability('81000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'svc_negative')->>'quantity')::numeric,
  0::numeric,
  'negative stock is clamped to zero'
);

select is(
  public.widget_public_stock_availability('81000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'svc_unpublished')->>'mode',
  'hidden',
  'unpublished stock remains hidden'
);

select is(
  public.widget_public_stock_availability('81000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'svc_delay')->>'label',
  'Disponible sous 3 jours',
  'delay mode publishes only the configured public delay'
);

select throws_ok(
  $$insert into public.widget_stock_publications (
      tenant_id, widget_id, shop_id, service_public_id, canonical_reference,
      publication_mode, exact_quantity_enabled, published
    ) values (
      '81000000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000001',
      '82000000-0000-4000-8000-000000000001',
      'svc_forbidden_exact', 'SCREEN-IP13', 'quantity', false, true
    )$$,
  '23514',
  null,
  'exact quantity cannot be enabled without explicit opt-in'
);

select ok(
  not has_table_privilege('anon', 'public.widget_stock_publications', 'select'),
  'anon cannot read internal stock publication mappings'
);

select ok(
  not has_function_privilege('anon', 'public.widget_public_stock_availability(uuid,uuid,uuid,text)', 'execute'),
  'anon cannot call the stock aggregation function directly'
);

select * from finish();

rollback;
