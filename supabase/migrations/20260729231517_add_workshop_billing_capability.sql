-- Capability axis 1: legal registration.
-- Existing workshops predate the capability and are all treated as registered.
-- New workshops default to no billing until registration is explicitly recorded.

alter table public.workshops
  add column if not exists siret text,
  add column if not exists has_billing boolean;

update public.workshops
set has_billing = true
where has_billing is null;

alter table public.workshops
  alter column has_billing set default false,
  alter column has_billing set not null;

comment on column public.workshops.has_billing is
  'Legal billing capability. Independent from the Behar Tech SaaS subscription plan.';

-- Public payloads are now read and written exclusively through server routes,
-- which evaluate the workshop capability before returning a DTO. Removing the
-- legacy direct browser policies prevents historical JSON from bypassing that
-- server-side redaction. Service-role access is unaffected.
do $$
begin
  if to_regclass('public.public_tracking_repairs') is not null then
    execute 'drop policy if exists "public_tracking_anon_select" on public.public_tracking_repairs';
    execute 'drop policy if exists "public_tracking_anon_insert" on public.public_tracking_repairs';
    execute 'drop policy if exists "public_tracking_anon_update" on public.public_tracking_repairs';
    execute 'revoke select, insert, update on public.public_tracking_repairs from anon, authenticated';
  end if;

  if to_regclass('public.public_tracking_documents') is not null then
    execute 'drop policy if exists "public_tracking_docs_anon_select" on public.public_tracking_documents';
    execute 'drop policy if exists "public_tracking_docs_anon_insert" on public.public_tracking_documents';
    execute 'drop policy if exists "public_tracking_docs_anon_update" on public.public_tracking_documents';
    execute 'revoke select, insert, update on public.public_tracking_documents from anon, authenticated';
  end if;
end
$$;

-- Non-destructive verification of historical public payloads. Nothing is
-- deleted or rewritten: each matching token is emitted to the migration log.
do $$
declare
  leaked record;
begin
  if to_regclass('public.public_tracking_documents') is null then
    raise notice '[billing-capability-audit] public_tracking_documents is absent; nothing to inspect';
    return;
  end if;

  for leaked in
    select
      document.token,
      document.kind,
      document.workshop_id
    from public.public_tracking_documents as document
    join public.workshops as workshop
      on document.workshop_id = workshop.id::text
    where workshop.has_billing = false
      and (
        document.public_data @? '$.**.amount'
        or document.public_data @? '$.**.customerPrice'
        or document.public_data @? '$.**.totalTtc'
        or document.public_data @? '$.**.unitPriceTtc'
      )
  loop
    raise warning
      '[billing-capability-audit] public document token=% kind=% workshop=% contains amount fields',
      leaked.token,
      leaked.kind,
      leaked.workshop_id;
  end loop;
end
$$;
