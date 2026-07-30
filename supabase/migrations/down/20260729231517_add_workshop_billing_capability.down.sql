-- Explicit rollback for 20260729231517_add_workshop_billing_capability.sql.
-- The pre-existing nullable `siret` column is intentionally preserved.

alter table public.workshops
  drop column if exists has_billing;

do $$
begin
  if to_regclass('public.public_tracking_repairs') is not null then
    execute 'create policy "public_tracking_anon_select" on public.public_tracking_repairs for select to anon, authenticated using (true)';
    execute 'create policy "public_tracking_anon_insert" on public.public_tracking_repairs for insert to anon, authenticated with check (true)';
    execute 'create policy "public_tracking_anon_update" on public.public_tracking_repairs for update to anon, authenticated using (true) with check (true)';
    execute 'grant select, insert, update on public.public_tracking_repairs to anon, authenticated';
  end if;

  if to_regclass('public.public_tracking_documents') is not null then
    execute 'create policy "public_tracking_docs_anon_select" on public.public_tracking_documents for select to anon, authenticated using (true)';
    execute 'create policy "public_tracking_docs_anon_insert" on public.public_tracking_documents for insert to anon, authenticated with check (true)';
    execute 'create policy "public_tracking_docs_anon_update" on public.public_tracking_documents for update to anon, authenticated using (true) with check (true)';
    execute 'grant select, insert, update on public.public_tracking_documents to anon, authenticated';
  end if;
end
$$;
