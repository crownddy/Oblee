-- Row Level Security tests: private events and the 18+ sign-up rule.
-- Run with scripts/test-rls.sh. Every query runs as the role a real client would
-- use, so these assertions exercise PostgREST's own path, not the app's helpers.

\set ON_ERROR_STOP on

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'organiser@oblee.test',
   '{"full_name":"Ada Organiser","role":"organiser","date_of_birth":"1990-01-01"}'),
  ('22222222-2222-4222-8222-222222222222', 'attendee@oblee.test',
   '{"full_name":"Bola Attendee","role":"attendee","date_of_birth":"1995-06-15"}'),
  ('33333333-3333-4333-8333-333333333333', 'guest@oblee.test',
   '{"full_name":"Chidi Guest","role":"attendee","date_of_birth":"1992-03-10"}'),
  ('44444444-4444-4444-8444-444444444444', 'admin@oblee.test',
   '{"full_name":"Dami Admin","role":"attendee","date_of_birth":"1988-09-09"}');

alter table public.profiles disable trigger profiles_guard_role;
update public.profiles set role = 'admin' where id = '44444444-4444-4444-8444-444444444444';
alter table public.profiles enable trigger profiles_guard_role;

insert into public.events (id, organiser_id, title, category, venue, city, starts_at, visibility, status, archived_at) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'Public Rooftop', 'party', 'Lekki', 'Lagos', now() + interval '7 days', 'public', 'published', null),
  ('aaaaaaaa-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'Private Villa', 'party', 'Ikoyi', 'Lagos', now() + interval '8 days', 'private', 'published', null),
  ('aaaaaaaa-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   'Private Archive', 'party', 'Ikeja', 'Lagos', now() - interval '8 days', 'private', 'archived', now());

insert into public.event_ticket_tiers (event_id, name, price) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Regular', 5000),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'VIP', 20000);

insert into public.event_tables (event_id, seats, quantity) values
  ('aaaaaaaa-0000-4000-8000-000000000002', 4, 3);

insert into public.event_contacts (event_id, kind, caption, value) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'whatsapp', 'Chat on WhatsApp', '+2348000000001'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'whatsapp', 'Chat on WhatsApp', '+2348000000002');

insert into public.event_access (event_id, user_id, granted_by) values
  ('aaaaaaaa-0000-4000-8000-000000000002',
   '33333333-3333-4333-8333-333333333333',
   '11111111-1111-4111-8111-111111111111');

insert into public.featured_events (event_id, rank) values
  ('aaaaaaaa-0000-4000-8000-000000000002', 1);

-- Anonymous visitor ---------------------------------------------------------
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select tests.expect(
  (select count(*) from public.events),
  1, 'anon sees only the published public event');
select tests.expect(
  (select count(*) from public.events where id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0, 'anon cannot read a private event by direct id');
select tests.expect(
  (select count(*) from public.event_ticket_tiers),
  1, 'anon sees tiers of the public event only');
select tests.expect(
  (select count(*) from public.event_ticket_tiers where event_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0, 'anon cannot read private ticket tiers');
select tests.expect(
  (select count(*) from public.event_tables),
  0, 'anon cannot read private tables');
select tests.expect(
  (select count(*) from public.event_contacts),
  1, 'anon sees public contact details only');
select tests.expect(
  (select count(*) from public.event_contacts where event_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0, 'anon cannot read private contact details');
select tests.expect(
  (select count(*) from public.featured_events),
  0, 'a featured private event stays hidden from anon');

reset role;

-- Signed-in attendee without a grant ----------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

select tests.expect(
  (select count(*) from public.events),
  1, 'attendee without a grant sees only public events');
select tests.expect(
  (select count(*) from public.events where id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0, 'attendee cannot read a private event by direct id');
select tests.expect(
  (select count(*) from public.event_ticket_tiers where event_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0, 'attendee cannot read private ticket tiers');
select tests.expect(
  (select count(*) from public.event_contacts where event_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0, 'attendee cannot read private contact details');
select tests.expect(
  (select count(*) from public.event_access where user_id <> '22222222-2222-4222-8222-222222222222'),
  0, 'attendee cannot read other people''s access grants');
select tests.expect(
  (select count(*) from public.featured_events),
  0, 'a featured private event stays hidden from a signed-in attendee');

do $$
begin
  insert into public.saved_events (user_id, event_id)
  values ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-0000-4000-8000-000000000002');
  raise exception 'FAIL: attendee saved a private event without access';
exception
  when insufficient_privilege then
    raise notice 'ok: saving a private event without access is blocked';
end;
$$;

do $$
begin
  perform public.grant_event_access(
    'aaaaaaaa-0000-4000-8000-000000000002', 'attendee@oblee.test');
  raise exception 'FAIL: attendee granted themselves access to someone else''s event';
exception
  when insufficient_privilege then
    raise notice 'ok: attendees cannot grant private access';
end;
$$;

reset role;

-- Granted attendee ----------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);

select tests.expect(
  (select count(*) from public.events where id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  1, 'granted attendee reads the private event');
select tests.expect(
  (select count(*) from public.event_ticket_tiers where event_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  1, 'granted attendee reads private ticket tiers');
select tests.expect(
  (select count(*) from public.event_tables where event_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  1, 'granted attendee reads private tables');
select tests.expect(
  (select count(*) from public.event_contacts where event_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  1, 'granted attendee reads private contact details');
select tests.expect(
  (select count(*) from public.events where id = 'aaaaaaaa-0000-4000-8000-000000000003'),
  0, 'grant does not expose an archived private event');

reset role;

-- Organiser -----------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

select tests.expect(
  (select count(*) from public.events),
  3, 'organiser reads all of their own events');
select tests.expect(
  (select count(*) from public.events where id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  1, 'organiser reads their own private event');
select tests.expect(
  (select count(*) from public.featured_events where event_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  1, 'organiser sees the featured placement of their private event');

select tests.expect(
  (case when public.grant_event_access('aaaaaaaa-0000-4000-8000-000000000002', 'attendee@oblee.test')
    is not null then 1 else 0 end),
  1, 'organiser grants private access by email');

reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
select tests.expect(
  (select count(*) from public.events where id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  1, 'newly granted attendee now reads the private event');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select public.revoke_event_access(
  'aaaaaaaa-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
select tests.expect(
  (select count(*) from public.events where id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0, 'revoked attendee loses access immediately');
reset role;

-- Administrator -------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', false);

select tests.expect(
  (select count(*) from public.events),
  3, 'administrator reads every event');
select tests.expect(
  (select count(*) from public.event_contacts),
  2, 'administrator reads every contact row');

reset role;

-- Write paths ---------------------------------------------------------------
select tests.expect(
  (select count(*) from information_schema.role_table_grants
   where table_name = 'event_access' and grantee = 'authenticated' and privilege_type in ('INSERT', 'UPDATE', 'DELETE')),
  0, 'event_access has no direct write grants');
select tests.expect(
  (case when has_column_privilege('authenticated', 'public.profiles', 'date_of_birth', 'SELECT') then 1 else 0 end),
  0, 'date_of_birth is not exposed through the API');

-- Age restriction -----------------------------------------------------------
select tests.expect(
  (select count(*) from public.profiles
   where id = '22222222-2222-4222-8222-222222222222' and date_of_birth = '1995-06-15'),
  1, 'an adult sign-up stores the date of birth');

do $$
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (gen_random_uuid(), 'minor@oblee.test',
          '{"full_name":"Too Young","date_of_birth":"2015-01-01"}');
  raise exception 'FAIL: under-18 sign-up was accepted';
exception
  when others then
    if sqlerrm like 'FAIL:%' then
      raise;
    end if;
    raise notice 'ok: under-18 sign-up rejected (%)', sqlerrm;
end;
$$;

do $$
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (gen_random_uuid(), 'no-dob@oblee.test', '{"full_name":"No Birthday"}');
  raise exception 'FAIL: sign-up without a date of birth was accepted';
exception
  when others then
    if sqlerrm like 'FAIL:%' then
      raise;
    end if;
    raise notice 'ok: sign-up without a date of birth rejected (%)', sqlerrm;
end;
$$;

select tests.expect(
  (select count(*) from public.profiles where full_name in ('Too Young', 'No Birthday')),
  0, 'rejected sign-ups created no profile');

\echo 'All RLS and age-restriction checks passed.'
