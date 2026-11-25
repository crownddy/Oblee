-- Privilege probes: the writes and RPCs a hostile client would try directly,
-- bypassing the UI. Every case asserts that the database refuses the attempt.
-- Run with scripts/test-rls.sh.

\set ON_ERROR_STOP on

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('e1e1e1e1-1111-4111-8111-111111111111', 'probe-organiser@oblee.test',
   '{"full_name":"Ada Probe","role":"organiser","date_of_birth":"1990-01-01"}'),
  ('e2e2e2e2-2222-4222-8222-222222222222', 'probe-attendee@oblee.test',
   '{"full_name":"Bola Probe","role":"attendee","date_of_birth":"1995-06-15"}');

-- An organiser whose account predates the 18+ rule.
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id, email) values
  ('e3e3e3e3-3333-4333-8333-333333333333', 'probe-legacy@oblee.test');
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles (id, full_name, role) values
  ('e3e3e3e3-3333-4333-8333-333333333333', 'Legacy Probe', 'organiser');

-- The legacy event predates 0011, so it exists while its organiser is unverified.
alter table public.events disable trigger events_require_verified_adult;
insert into public.events (id, organiser_id, title, category, venue, city, starts_at, visibility, status) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'e1e1e1e1-1111-4111-8111-111111111111',
   'Probe Public Event', 'party', 'Lekki', 'Lagos', now() + interval '6 days', 'public', 'published'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'e3e3e3e3-3333-4333-8333-333333333333',
   'Legacy Live Event', 'party', 'Ikeja', 'Lagos', now() + interval '6 days', 'public', 'published');
alter table public.events enable trigger events_require_verified_adult;

-- A helper that fails loudly when a statement unexpectedly succeeds.
create schema if not exists probe;
grant usage on schema probe to public;

create or replace function probe.refused(p_sql text, p_label text, p_expect text default null)
returns void
language plpgsql
as $$
begin
  execute p_sql;
  raise exception 'FAIL: % was accepted', p_label;
exception
  when others then
    if sqlerrm like 'FAIL:%' then
      raise;
    end if;
    if p_expect is not null and position(p_expect in sqlerrm) = 0 then
      raise exception 'FAIL: % refused with the wrong error (%)', p_label, sqlerrm;
    end if;
    raise notice 'ok: % (%)', p_label, sqlerrm;
end;
$$;
grant execute on function probe.refused(text, text, text) to public;

-- Signed-in attendee --------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', 'e2e2e2e2-2222-4222-8222-222222222222', false);

select probe.refused(
  $$update public.profiles set role = 'admin' where id = 'e2e2e2e2-2222-4222-8222-222222222222'$$,
  'promoting yourself to administrator');
select probe.refused(
  $$update public.profiles set date_of_birth = '1990-01-01' where id = 'e2e2e2e2-2222-4222-8222-222222222222'$$,
  'writing your own date of birth');
select probe.refused(
  $$select date_of_birth from public.profiles where id = 'e2e2e2e2-2222-4222-8222-222222222222'$$,
  'reading a date of birth over the API');
select probe.refused(
  $$insert into public.events (organiser_id, title, category, venue, starts_at)
    values ('e2e2e2e2-2222-4222-8222-222222222222', 'Forged Event', 'party', 'Lagos', now())$$,
  'inserting an event directly');
select probe.refused(
  $$update public.events set title = 'Hijacked' where id = 'eeeeeeee-0000-4000-8000-000000000001'$$,
  'editing another organiser''s event directly');
select probe.refused(
  $$delete from public.events where id = 'eeeeeeee-0000-4000-8000-000000000001'$$,
  'deleting an event directly');
select probe.refused(
  $$insert into public.featured_events (event_id) values ('eeeeeeee-0000-4000-8000-000000000001')$$,
  'featuring an event directly');
select probe.refused(
  $$insert into public.event_access (event_id, user_id)
    values ('eeeeeeee-0000-4000-8000-000000000001', 'e2e2e2e2-2222-4222-8222-222222222222')$$,
  'granting yourself private access');
select probe.refused(
  $$insert into public.event_reports (event_id, reporter_id, reason)
    values ('eeeeeeee-0000-4000-8000-000000000001', 'e2e2e2e2-2222-4222-8222-222222222222', 'spam')$$,
  'writing a report directly');

select probe.refused(
  $$select public.set_event_featured('eeeeeeee-0000-4000-8000-000000000001', true, 0)$$,
  'featuring an event by RPC', 'Administrators only');
select probe.refused(
  $$select public.set_user_role('e2e2e2e2-2222-4222-8222-222222222222', 'admin')$$,
  'setting a role by RPC', 'Administrators only');
select probe.refused(
  $$select public.admin_list_users()$$,
  'listing users by RPC', 'Administrators only');
select probe.refused(
  $$select public.remove_event('eeeeeeee-0000-4000-8000-000000000001')$$,
  'removing an event by RPC', 'Administrators only');
select probe.refused(
  $$select public.resolve_event_report(gen_random_uuid(), 'resolved')$$,
  'resolving a report by RPC', 'Administrators only');
select probe.refused(
  $$select public.grant_event_access('eeeeeeee-0000-4000-8000-000000000001', 'probe-attendee@oblee.test')$$,
  'granting access to someone else''s event', 'manage access');
select probe.refused(
  $$select public.update_event('eeeeeeee-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  'editing someone else''s event by RPC', 'only edit your own events');
select probe.refused(
  $$select public.archive_event('eeeeeeee-0000-4000-8000-000000000001')$$,
  'archiving someone else''s event by RPC', 'only archive your own events');
select probe.refused(
  $$select public.is_verified_adult('e1e1e1e1-1111-4111-8111-111111111111')$$,
  'asking about another account''s age', 'permission denied');
select probe.refused(
  $$select public.create_event(jsonb_build_object(
      'title', 'Attendee Event', 'category', 'party', 'venue', 'Lagos',
      'starts_at', to_jsonb(now() + interval '4 days'), 'is_free', true,
      'contacts', jsonb_build_array(jsonb_build_object(
        'kind', 'whatsapp', 'caption', 'Chat', 'value', '+2348000000001'))))$$,
  'creating an event as an attendee', 'Only organisers');

-- Unverified organiser ------------------------------------------------------
select set_config('request.jwt.claim.sub', 'e3e3e3e3-3333-4333-8333-333333333333', false);

select probe.refused(
  $$select public.update_event('eeeeeeee-0000-4000-8000-000000000002', jsonb_build_object(
      'title', 'Legacy Live Event', 'category', 'party', 'venue', 'Ikeja',
      'starts_at', to_jsonb(now() + interval '6 days'), 'timezone', 'Africa/Lagos',
      'is_free', true,
      'contacts', jsonb_build_array(jsonb_build_object(
        'kind', 'whatsapp', 'caption', 'Chat', 'value', '+2348000000002'))))$$,
  'editing a live event without a date of birth', 'Verify your age');
select probe.refused(
  $$select public.create_event(jsonb_build_object(
      'title', 'Unverified Event', 'category', 'party', 'venue', 'Lagos',
      'starts_at', to_jsonb(now() + interval '4 days'), 'is_free', true,
      'contacts', jsonb_build_array(jsonb_build_object(
        'kind', 'whatsapp', 'caption', 'Chat', 'value', '+2348000000003'))))$$,
  'publishing without a date of birth', 'Verify your age');

-- Taking an event down must still work: the rule fails closed, not open.
select public.archive_event('eeeeeeee-0000-4000-8000-000000000002');
select tests.expect(
  (select count(*) from public.events
   where id = 'eeeeeeee-0000-4000-8000-000000000002' and status = 'archived'),
  1, 'an unverified organiser can still archive their own event');

reset role;

-- Anonymous visitor ---------------------------------------------------------
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select probe.refused(
  $$select public.create_event('{}'::jsonb)$$, 'calling create_event anonymously', 'permission denied');
select probe.refused(
  $$select public.my_age_status()$$, 'calling my_age_status anonymously', 'permission denied');
select probe.refused(
  $$select public.set_my_date_of_birth('1990-01-01'::date)$$,
  'submitting a date of birth anonymously', 'permission denied');
select probe.refused(
  $$select public.promote_to_organiser()$$, 'promoting an anonymous visitor', 'permission denied');
select probe.refused(
  $$select 1 from public.event_access limit 1$$, 'reading access grants anonymously', 'permission denied');

reset role;

-- Content limits (0012) also hold for a caller that skips the Server Actions.
select probe.refused(
  $$insert into public.events (organiser_id, title, category, venue, starts_at, timezone)
    values ('e1e1e1e1-1111-4111-8111-111111111111', 'Bad Timezone', 'party', 'Lagos',
            now() + interval '3 days', 'Mars/Olympus')$$,
  'storing an unusable timezone');
select probe.refused(
  $$insert into public.events (organiser_id, title, category, venue, starts_at, security_note)
    values ('e1e1e1e1-1111-4111-8111-111111111111', 'Long Note', 'party', 'Lagos',
            now() + interval '3 days', repeat('x', 400))$$,
  'storing an oversized security note');
select probe.refused(
  $$insert into public.events (organiser_id, title, category, venue, starts_at, hero_image_url)
    values ('e1e1e1e1-1111-4111-8111-111111111111', 'Long Image', 'party', 'Lagos',
            now() + interval '3 days', 'https://example.test/' || repeat('a', 700))$$,
  'storing an oversized image link');

drop schema probe cascade;

\echo 'All privilege probes were refused by the database.'
