begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

select ok(
  not has_table_privilege('anon', 'public.workshop_snapshots', 'SELECT'),
  'anon ne peut lire aucun snapshot directement'
);
select ok(
  not has_table_privilege('authenticated', 'public.workshop_snapshots', 'UPDATE'),
  'authenticated ne peut modifier aucun snapshot directement'
);
select ok(
  not has_function_privilege('anon', 'public.snapshot_pull(text)', 'EXECUTE'),
  'anon ne peut contourner l API avec snapshot_pull'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.snapshot_push(text,uuid,text,text,jsonb,integer,integer)',
    'EXECUTE'
  ),
  'authenticated ne peut contourner l API avec snapshot_push'
);
select ok(
  not has_table_privilege('anon', 'public.public_tracking_repairs', 'INSERT'),
  'anon ne peut publier un suivi réparation'
);
select ok(
  not has_table_privilege('anon', 'public.public_tracking_repairs', 'UPDATE'),
  'anon ne peut écraser un suivi réparation'
);
select ok(
  not has_table_privilege('anon', 'public.public_tracking_documents', 'INSERT'),
  'anon ne peut publier un document'
);
select ok(
  not has_table_privilege('authenticated', 'public.public_tracking_documents', 'UPDATE'),
  'authenticated ne peut écraser un document public'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.repair_messages'::regclass
      and conname = 'repair_messages_repair_workshop_fk'
      and confrelid = 'public.repairs'::regclass
  ),
  'un message est lié au couple atelier et dossier'
);
select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'repair_messages_client_idempotency_idx'
  ),
  'les messages publics sont idempotents'
);

select * from finish();
rollback;
