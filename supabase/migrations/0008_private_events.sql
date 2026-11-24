-- Oblee 0008: private event access.
--
-- Access rule: a private event is readable only by
--   1. its organiser,
--   2. administrators,
--   3. attendees holding an explicit grant in public.event_access, issued by the
--      organiser or an administrator through public.grant_event_access().
-- Published public events stay readable by everyone. Every related table
-- (ticket tiers, tables, contacts, saves, featured placement) inherits the rule
-- through public.can_view_event(), so a direct PostgREST query cannot bypass it.

create table if not exists public.event_access (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_access_user_idx on public.event_access (user_id);

create or replace function public.can_manage_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and (e.organiser_id = auth.uid() or public.is_admin())
  );
$$;

create or replace function public.can_view_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and (
        e.organiser_id = auth.uid()
        or public.is_admin()
        or (e.status = 'published' and e.visibility = 'public')
        or (
          e.status = 'published'
          and exists (
            select 1
            from public.event_access a
            where a.event_id = e.id and a.user_id = auth.uid()
          )
        )
      )
  );
$$;

revoke all on function public.can_manage_event(uuid) from public;
revoke all on function public.can_view_event(uuid) from public;
grant execute on function public.can_manage_event(uuid) to authenticated;
grant execute on function public.can_view_event(uuid) to anon, authenticated;

-- Grant and revoke are the only ways to write public.event_access.
create or replace function public.grant_event_access(p_event_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_organiser uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not public.can_manage_event(p_event_id) then
    raise exception 'You can only manage access for your own events.' using errcode = '42501';
  end if;

  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No Oblee account uses that email.';
  end if;

  select organiser_id into v_organiser from public.events where id = p_event_id;
  if v_user = v_organiser then
    raise exception 'The organiser already has access.';
  end if;

  insert into public.event_access (event_id, user_id, granted_by)
  values (p_event_id, v_user, auth.uid())
  on conflict (event_id, user_id) do nothing;

  return v_user;
end;
$$;

create or replace function public.revoke_event_access(p_event_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not public.can_manage_event(p_event_id) then
    raise exception 'You can only manage access for your own events.' using errcode = '42501';
  end if;

  delete from public.event_access where event_id = p_event_id and user_id = p_user_id;
end;
$$;

revoke all on function public.grant_event_access(uuid, text) from public, anon;
revoke all on function public.revoke_event_access(uuid, uuid) from public, anon;
grant execute on function public.grant_event_access(uuid, text) to authenticated;
grant execute on function public.revoke_event_access(uuid, uuid) to authenticated;

alter table public.event_access enable row level security;

drop policy if exists "People can read their own access grants" on public.event_access;
create policy "People can read their own access grants"
  on public.event_access for select
  to authenticated
  using (user_id = auth.uid() or public.can_manage_event(event_id));

revoke all on public.event_access from anon, authenticated;
grant select on public.event_access to authenticated;

-- events: replace the published-only rule with the private-aware rule.
drop policy if exists "Visible events are readable" on public.events;
create policy "Visible events are readable"
  on public.events for select
  to anon, authenticated
  using (public.can_view_event(id));

drop policy if exists "Visible ticket tiers are readable" on public.event_ticket_tiers;
create policy "Visible ticket tiers are readable"
  on public.event_ticket_tiers for select
  to anon, authenticated
  using (public.can_view_event(event_id));

drop policy if exists "Visible tables are readable" on public.event_tables;
create policy "Visible tables are readable"
  on public.event_tables for select
  to anon, authenticated
  using (public.can_view_event(event_id));

drop policy if exists "Visible contact details are readable" on public.event_contacts;
create policy "Visible contact details are readable"
  on public.event_contacts for select
  to anon, authenticated
  using (public.can_view_event(event_id));

-- Saving a private event requires access to it.
drop policy if exists "People can save visible events" on public.saved_events;
create policy "People can save visible events"
  on public.saved_events for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_view_event(event_id));

-- A private event must not leak through a featured placement.
drop policy if exists "Featured events are readable" on public.featured_events;
create policy "Featured events are readable"
  on public.featured_events for select
  to anon, authenticated
  using (public.can_view_event(event_id));

-- Reporting needs the same access as reading.
create or replace function public.report_event(p_event_id uuid, p_reason text, p_details text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_status public.event_status;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to report an event.' using errcode = '42501';
  end if;
  if not public.can_view_event(p_event_id) then
    raise exception 'Event not found.';
  end if;

  select organiser_id, status into v_owner, v_status from public.events where id = p_event_id;
  if v_owner is null then
    raise exception 'Event not found.';
  end if;
  if v_owner = v_uid then
    raise exception 'You cannot report your own event.' using errcode = '42501';
  end if;
  if v_status <> 'published' then
    raise exception 'Only published events can be reported.';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Add a reason for the report.';
  end if;

  insert into public.event_reports (event_id, reporter_id, reason, details)
  values (p_event_id, v_uid, left(trim(p_reason), 120), left(coalesce(p_details, ''), 600))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.report_event(uuid, text, text) from public, anon;
grant execute on function public.report_event(uuid, text, text) to authenticated;
