-- Oblee 0006: Row Level Security.
-- Reads are public for published events. Writes happen only through 0005.

grant execute on function public.is_admin() to anon, authenticated;

alter table public.events enable row level security;
alter table public.event_ticket_tiers enable row level security;
alter table public.event_tables enable row level security;
alter table public.event_contacts enable row level security;
alter table public.saved_events enable row level security;
alter table public.event_reports enable row level security;
alter table public.featured_events enable row level security;

-- events: published are public; owners and admins can read everything else.
drop policy if exists "Visible events are readable" on public.events;
create policy "Visible events are readable"
  on public.events for select
  to anon, authenticated
  using (
    status = 'published'
    or organiser_id = auth.uid()
    or public.is_admin()
  );

-- children inherit the visibility of their event.
drop policy if exists "Visible ticket tiers are readable" on public.event_ticket_tiers;
create policy "Visible ticket tiers are readable"
  on public.event_ticket_tiers for select
  to anon, authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id
      and (e.status = 'published' or e.organiser_id = auth.uid() or public.is_admin())
  ));

drop policy if exists "Visible tables are readable" on public.event_tables;
create policy "Visible tables are readable"
  on public.event_tables for select
  to anon, authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id
      and (e.status = 'published' or e.organiser_id = auth.uid() or public.is_admin())
  ));

drop policy if exists "Visible contact details are readable" on public.event_contacts;
create policy "Visible contact details are readable"
  on public.event_contacts for select
  to anon, authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id
      and (e.status = 'published' or e.organiser_id = auth.uid() or public.is_admin())
  ));

-- saved events belong to exactly one attendee.
drop policy if exists "People can read their saves" on public.saved_events;
create policy "People can read their saves"
  on public.saved_events for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "People can save visible events" on public.saved_events;
create policy "People can save visible events"
  on public.saved_events for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and (e.status = 'published' or e.organiser_id = auth.uid())
    )
  );

drop policy if exists "People can remove their saves" on public.saved_events;
create policy "People can remove their saves"
  on public.saved_events for delete
  to authenticated
  using (user_id = auth.uid());

-- reports: reporters see their own, admins see all. Inserts go through report_event().
drop policy if exists "Reporters and admins can read reports" on public.event_reports;
create policy "Reporters and admins can read reports"
  on public.event_reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- featured placement is readable by everyone, writable only by set_event_featured().
drop policy if exists "Featured events are readable" on public.featured_events;
create policy "Featured events are readable"
  on public.featured_events for select
  to anon, authenticated
  using (true);

-- Remove the default Supabase table grants, then hand back only what is needed.
revoke all on public.events from anon, authenticated;
revoke all on public.event_ticket_tiers from anon, authenticated;
revoke all on public.event_tables from anon, authenticated;
revoke all on public.event_contacts from anon, authenticated;
revoke all on public.saved_events from anon, authenticated;
revoke all on public.event_reports from anon, authenticated;
revoke all on public.featured_events from anon, authenticated;

grant select on public.events to anon, authenticated;
grant select on public.event_ticket_tiers to anon, authenticated;
grant select on public.event_tables to anon, authenticated;
grant select on public.event_contacts to anon, authenticated;
grant select on public.featured_events to anon, authenticated;

grant select, insert, delete on public.saved_events to authenticated;
grant select on public.event_reports to authenticated;
