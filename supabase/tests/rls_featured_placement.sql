-- Row Level Security tests: featured placement eligibility and archive cleanup.
-- Run with scripts/test-rls.sh. Every query runs as the role a real client would
-- use, so these assertions exercise PostgREST's own path, not the app's helpers.

\set ON_ERROR_STOP on

-- Every suite shares one throwaway database, so this one runs inside a
-- transaction and rolls back: its fixtures must not shift the row counts the
-- other suites assert on.
begin;

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-0000-4000-8000-000000000001', 'featured-organiser@oblee.test',
   '{"full_name":"Ada Organiser","role":"organiser","date_of_birth":"1990-01-01"}'),
  ('dddddddd-0000-4000-8000-000000000002', 'featured-rival@oblee.test',
   '{"full_name":"Bola Rival","role":"organiser","date_of_birth":"1991-02-02"}'),
  ('dddddddd-0000-4000-8000-000000000003', 'featured-admin@oblee.test',
   '{"full_name":"Dami Admin","role":"attendee","date_of_birth":"1988-09-09"}');

alter table public.profiles disable trigger profiles_guard_role;
update public.profiles set role = 'admin' where id = 'dddddddd-0000-4000-8000-000000000003';
alter table public.profiles enable trigger profiles_guard_role;

-- Six stale placements (archived) sit in the first six ranks, exactly the shape
-- that used to fill the carousel limit before eligibility was checked.
insert into public.events (id, organiser_id, title, category, venue, city, starts_at, visibility, status, archived_at) values
  ('ffffffff-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Stale One',   'party', 'Lekki',  'Lagos', now() + interval '3 days', 'public',  'archived',  now()),
  ('ffffffff-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Stale Two',   'party', 'Lekki',  'Lagos', now() + interval '3 days', 'public',  'archived',  now()),
  ('ffffffff-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000001', 'Stale Three', 'party', 'Lekki',  'Lagos', now() + interval '3 days', 'public',  'archived',  now()),
  ('ffffffff-0000-4000-8000-000000000004', 'dddddddd-0000-4000-8000-000000000001', 'Stale Four',  'party', 'Lekki',  'Lagos', now() + interval '3 days', 'public',  'archived',  now()),
  ('ffffffff-0000-4000-8000-000000000005', 'dddddddd-0000-4000-8000-000000000001', 'Stale Five',  'party', 'Lekki',  'Lagos', now() + interval '3 days', 'public',  'archived',  now()),
  ('ffffffff-0000-4000-8000-000000000006', 'dddddddd-0000-4000-8000-000000000001', 'Stale Six',   'party', 'Lekki',  'Lagos', now() + interval '3 days', 'public',  'archived',  now());

-- Eligible placements, ranked after the stale ones.
insert into public.events (id, organiser_id, title, category, venue, city, starts_at, visibility, status, archived_at) values
  ('ffffffff-0000-4000-8000-000000000007', 'dddddddd-0000-4000-8000-000000000001', 'Valid Seven',  'party', 'Lekki', 'Lagos', now() + interval '7 days', 'public',  'published', null),
  ('ffffffff-0000-4000-8000-000000000008', 'dddddddd-0000-4000-8000-000000000001', 'Valid Eight',  'party', 'Lekki', 'Lagos', now() + interval '8 days', 'public',  'published', null),
  ('ffffffff-0000-4000-8000-000000000009', 'dddddddd-0000-4000-8000-000000000001', 'Archive Me',   'party', 'Lekki', 'Lagos', now() + interval '9 days', 'public',  'published', null),
  ('ffffffff-0000-4000-8000-000000000010', 'dddddddd-0000-4000-8000-000000000002', 'Rival Party',  'party', 'Lekki', 'Lagos', now() + interval '10 days', 'public', 'published', null),
  ('ffffffff-0000-4000-8000-000000000011', 'dddddddd-0000-4000-8000-000000000001', 'Private Fx',   'party', 'Lekki', 'Lagos', now() + interval '11 days', 'private', 'published', null),
  ('ffffffff-0000-4000-8000-000000000012', 'dddddddd-0000-4000-8000-000000000001', 'Plain Archive','party', 'Lekki', 'Lagos', now() + interval '12 days', 'public',  'published', null),
  ('ffffffff-0000-4000-8000-000000000013', 'dddddddd-0000-4000-8000-000000000001', 'Not Yours',    'party', 'Lekki', 'Lagos', now() + interval '13 days', 'public',  'published', null);

insert into public.featured_events (event_id, rank) values
  ('ffffffff-0000-4000-8000-000000000001', 0),
  ('ffffffff-0000-4000-8000-000000000002', 1),
  ('ffffffff-0000-4000-8000-000000000003', 2),
  ('ffffffff-0000-4000-8000-000000000004', 3),
  ('ffffffff-0000-4000-8000-000000000005', 4),
  ('ffffffff-0000-4000-8000-000000000006', 5),
  ('ffffffff-0000-4000-8000-000000000007', 6),
  ('ffffffff-0000-4000-8000-000000000008', 7),
  ('ffffffff-0000-4000-8000-000000000009', 8),
  ('ffffffff-0000-4000-8000-000000000010', 9),
  ('ffffffff-0000-4000-8000-000000000011', 10),
  ('ffffffff-0000-4000-8000-000000000013', 11);

-- Anonymous visitor: RLS already hides stale placements ----------------------
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select tests.expect(
  (select count(*) from public.featured_events),
  5, 'anon sees only published public placements');

select tests.expect(
  (select count(*)
   from (select f.event_id
         from public.featured_events f
         join public.events e on e.id = f.event_id
         where e.status = 'published' and e.visibility = 'public'
         order by f.rank
         limit 6) as slots),
  5, 'the carousel query returns every eligible placement for anon');

reset role;

-- Signed-in organiser: eligibility must be part of the query ----------------
set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000000001', false);

select tests.expect(
  (select count(*) from public.featured_events),
  12, 'an organiser can also see featured rows for their own archived events');

-- Old shape: rank + limit first, eligibility applied afterwards.
select tests.expect(
  (select count(*)
   from (select f.event_id from public.featured_events f order by f.rank limit 6) as slots
   join public.events e on e.id = slots.event_id
   where e.status = 'published' and e.visibility = 'public'),
  0, 'limiting before the eligibility filter yields six unusable slots');

-- New shape: eligibility inside the query, then the same limit.
select tests.expect(
  (select count(*)
   from (select f.event_id
         from public.featured_events f
         join public.events e on e.id = f.event_id
         where e.status = 'published' and e.visibility = 'public'
         order by f.rank
         limit 6) as slots),
  5, 'filtering first fills the carousel from valid placements only');

select tests.expect(
  (select count(*)
   from (select f.event_id
         from public.featured_events f
         join public.events e on e.id = f.event_id
         where e.status = 'published' and e.visibility = 'public'
         order by f.rank
         limit 6) as slots
   join public.events e on e.id = slots.event_id
   where e.status <> 'published'),
  0, 'no archived event survives the carousel query');

select tests.expect(
  (select count(*)
   from (select f.event_id
         from public.featured_events f
         join public.events e on e.id = f.event_id
         where e.status = 'published' and e.visibility = 'public'
         order by f.rank
         limit 6) as slots
   where slots.event_id = 'ffffffff-0000-4000-8000-000000000011'),
  0, 'a private placement is never part of the carousel query');

-- Archiving clears the placement --------------------------------------------
select public.archive_event('ffffffff-0000-4000-8000-000000000009');

select tests.expect(
  (select count(*) from public.events
   where id = 'ffffffff-0000-4000-8000-000000000009'
     and status = 'archived' and archived_at is not null),
  1, 'archiving still moves the event to archived');

select tests.expect(
  (select count(*) from public.featured_events
   where event_id = 'ffffffff-0000-4000-8000-000000000009'),
  0, 'archiving removes the featured placement');

select public.archive_event('ffffffff-0000-4000-8000-000000000012');

select tests.expect(
  (select count(*) from public.events
   where id = 'ffffffff-0000-4000-8000-000000000012' and status = 'archived'),
  1, 'archiving an event with no placement still works');

select tests.expect(
  (select count(*) from public.featured_events
   where event_id = 'ffffffff-0000-4000-8000-000000000008'),
  1, 'archiving one event leaves other placements alone');

-- Archive authorization is unchanged ----------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000000002', false);

do $$
begin
  perform public.archive_event('ffffffff-0000-4000-8000-000000000013');
  raise exception 'FAIL: an organiser archived someone else''s event';
exception
  when insufficient_privilege then
    raise notice 'ok: archiving another organiser''s event is blocked';
end;
$$;

select tests.expect(
  (select count(*) from public.events
   where id = 'ffffffff-0000-4000-8000-000000000013' and status = 'published'),
  1, 'a blocked archive leaves the event published');

select tests.expect(
  (select count(*) from public.featured_events
   where event_id = 'ffffffff-0000-4000-8000-000000000013'),
  1, 'a blocked archive leaves the placement in place');

-- An organiser cannot remove events either (unchanged) -----------------------
do $$
begin
  perform public.remove_event('ffffffff-0000-4000-8000-000000000007');
  raise exception 'FAIL: an organiser removed an event';
exception
  when insufficient_privilege then
    raise notice 'ok: remove_event stays administrator-only';
end;
$$;

select tests.expect(
  (select count(*) from public.featured_events
   where event_id = 'ffffffff-0000-4000-8000-000000000007'),
  1, 'a blocked removal leaves the placement in place');

-- Administrator archive and removal ----------------------------------------
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000000003', false);

select public.archive_event('ffffffff-0000-4000-8000-000000000007');

select tests.expect(
  (select count(*) from public.featured_events
   where event_id = 'ffffffff-0000-4000-8000-000000000007'),
  0, 'an administrator archiving someone else''s event clears its placement');

select public.remove_event('ffffffff-0000-4000-8000-000000000010');

select tests.expect(
  (select count(*) from public.events
   where id = 'ffffffff-0000-4000-8000-000000000010'
     and status = 'removed' and archived_at is null),
  1, 'removing an event still marks it removed');

select tests.expect(
  (select count(*) from public.featured_events
   where event_id = 'ffffffff-0000-4000-8000-000000000010'),
  0, 'removing an event still clears its placement');

reset role;

rollback;
