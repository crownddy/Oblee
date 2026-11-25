-- Row Level Security tests: private event images and existing-account age checks.
-- Run with scripts/test-rls.sh. Every query runs as the role a real client would
-- use, so these assertions exercise the policies PostgREST and Storage rely on.

\set ON_ERROR_STOP on

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('55555555-5555-4555-8555-555555555555', 'img-organiser@oblee.test',
   '{"full_name":"Ada Image","role":"organiser","date_of_birth":"1990-01-01"}'),
  ('66666666-6666-4666-8666-666666666666', 'img-rival@oblee.test',
   '{"full_name":"Bode Rival","role":"organiser","date_of_birth":"1991-02-02"}'),
  ('77777777-7777-4777-8777-777777777777', 'img-guest@oblee.test',
   '{"full_name":"Chi Guest","role":"attendee","date_of_birth":"1994-04-04"}'),
  ('88888888-8888-4888-8888-888888888888', 'img-stranger@oblee.test',
   '{"full_name":"Dayo Stranger","role":"attendee","date_of_birth":"1993-05-05"}'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'img-admin@oblee.test',
   '{"full_name":"Dami Image Admin","role":"attendee","date_of_birth":"1988-09-09"}');

alter table public.profiles disable trigger profiles_guard_role;
update public.profiles set role = 'admin' where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
alter table public.profiles enable trigger profiles_guard_role;

-- An account created before the 18+ rule: it has no date of birth.
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id, email) values
  ('99999999-9999-4999-8999-999999999999', 'legacy-organiser@oblee.test');
alter table auth.users enable trigger on_auth_user_created;
insert into public.profiles (id, full_name, role) values
  ('99999999-9999-4999-8999-999999999999', 'Legacy Organiser', 'organiser');

insert into public.events (id, organiser_id, title, category, venue, city, starts_at, visibility, status, hero_image_url) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '55555555-5555-4555-8555-555555555555',
   'Rooftop Sessions', 'party', 'Lekki', 'Lagos', now() + interval '7 days', 'public', 'published',
   '55555555-5555-4555-8555-555555555555/public-cover.jpg'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '55555555-5555-4555-8555-555555555555',
   'Villa Night', 'party', 'Ikoyi', 'Lagos', now() + interval '9 days', 'private', 'published',
   '55555555-5555-4555-8555-555555555555/private-cover.jpg');

insert into public.event_access (event_id, user_id, granted_by) values
  ('bbbbbbbb-0000-4000-8000-000000000002',
   '77777777-7777-4777-8777-777777777777',
   '55555555-5555-4555-8555-555555555555');

insert into storage.objects (bucket_id, name, owner) values
  ('event-images', '55555555-5555-4555-8555-555555555555/public-cover.jpg', '55555555-5555-4555-8555-555555555555'),
  ('event-images', '55555555-5555-4555-8555-555555555555/private-cover.jpg', '55555555-5555-4555-8555-555555555555'),
  ('event-images', '55555555-5555-4555-8555-555555555555/draft-cover.jpg', '55555555-5555-4555-8555-555555555555');

-- Bucket ---------------------------------------------------------------------
select tests.expect(
  (select case when public then 1 else 0 end from storage.buckets where id = 'event-images'),
  0, 'the event-images bucket is private');

-- Anonymous visitor ----------------------------------------------------------
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select tests.expect(
  (select count(*) from storage.objects
   where name = '55555555-5555-4555-8555-555555555555/public-cover.jpg'),
  1, 'anon can read the cover of a public event');
select tests.expect(
  (select count(*) from storage.objects
   where name = '55555555-5555-4555-8555-555555555555/private-cover.jpg'),
  0, 'anon cannot read a private event cover');
select tests.expect(
  (select count(*) from storage.objects
   where name = '55555555-5555-4555-8555-555555555555/draft-cover.jpg'),
  0, 'anon cannot read an unattached upload');
select tests.expect(
  (select case when public.can_read_event_image('55555555-5555-4555-8555-555555555555/private-cover.jpg') then 1 else 0 end),
  0, 'anon is refused a storage read of the private cover');

reset role;

-- Attendee with a grant on the private event ---------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777777', false);

select tests.expect(
  (select count(*) from storage.objects where name like '55555555%'),
  2, 'granted attendee reads the public and private covers');
select tests.expect(
  (select count(*) from storage.objects where name = '55555555-5555-4555-8555-555555555555/draft-cover.jpg'),
  0, 'granted attendee still cannot read unattached uploads');

reset role;

-- Attendee without a grant ---------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888888', false);

select tests.expect(
  (select count(*) from storage.objects where name like '55555555%'),
  1, 'stranger reads only the public cover');

reset role;

-- Fellow organiser -----------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', false);

select tests.expect(
  (select count(*) from storage.objects where name = '55555555-5555-4555-8555-555555555555/draft-cover.jpg'),
  0, 'another organiser cannot read a colleague''s draft upload');

-- Uploads and attachments ----------------------------------------------------
do $$
begin
  insert into storage.objects (bucket_id, name, owner)
  values ('event-images', '55555555-5555-4555-8555-555555555555/foreign.jpg',
          '66666666-6666-4666-8666-666666666666');
  raise exception 'FAIL: an upload was accepted outside the caller''s folder';
exception
  when others then
    if sqlerrm like 'FAIL:%' then
      raise;
    end if;
    raise notice 'ok: cross-folder upload rejected (%)', sqlerrm;
end;
$$;

reset role;

-- Owner and administrator ----------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', false);
select tests.expect(
  (select count(*) from storage.objects where name like '55555555%'),
  3, 'the uploader reads every file in their own folder');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', false);
select tests.expect(
  (select count(*) from storage.objects where name like '55555555%'),
  3, 'an administrator reads any event image');
reset role;

do $$
begin
  insert into public.events (organiser_id, title, category, venue, starts_at, visibility, status, hero_image_url)
  values ('55555555-5555-4555-8555-555555555555', 'Stolen Cover', 'party', 'Lekki', now() + interval '3 days',
          'public', 'published',
          '66666666-6666-4666-8666-666666666666/private-cover.jpg');
  raise exception 'FAIL: an event accepted another organiser''s image path';
exception
  when others then
    if sqlerrm like 'FAIL:%' then
      raise;
    end if;
    raise notice 'ok: foreign image path rejected (%)', sqlerrm;
end;
$$;

-- Existing accounts ----------------------------------------------------------
select tests.expect(
  (select case when public.is_verified_adult('99999999-9999-4999-8999-999999999999') then 1 else 0 end),
  0, 'a legacy account without a date of birth is not verified');

set role authenticated;
select set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', false);

select tests.expect(
  (select case when (public.my_age_status() ->> 'has_date_of_birth')::boolean then 1 else 0 end),
  0, 'my_age_status reports the missing date of birth');

do $$
begin
  perform public.create_event(jsonb_build_object(
    'title', 'Legacy Party',
    'category', 'party',
    'venue', 'Lagos',
    'starts_at', to_jsonb(now() + interval '5 days'),
    'timezone', 'Africa/Lagos',
    'is_free', true,
    'contacts', jsonb_build_array(jsonb_build_object(
      'kind', 'whatsapp', 'caption', 'Chat on WhatsApp', 'value', '+2348000000009'))));
  raise exception 'FAIL: an unverified organiser published an event';
exception
  when others then
    if sqlerrm like 'FAIL:%' then
      raise;
    end if;
    raise notice 'ok: unverified organiser cannot publish (%)', sqlerrm;
end;
$$;

do $$
begin
  perform public.set_my_date_of_birth((current_date - interval '17 years')::date);
  raise exception 'FAIL: an under-18 date of birth was accepted';
exception
  when others then
    if sqlerrm like 'FAIL:%' then
      raise;
    end if;
    raise notice 'ok: under-18 date of birth rejected (%)', sqlerrm;
end;
$$;

select tests.expect(
  (select case when public.set_my_date_of_birth('1990-05-05'::date) is not null then 1 else 0 end),
  1, 'an adult date of birth is accepted');
select tests.expect(
  (select case when public.my_age_status() ->> 'date_of_birth' = '1990-05-05' then 1 else 0 end),
  1, 'the date of birth is stored for the account');
select tests.expect(
  (select case when (public.my_age_status() ->> 'is_adult')::boolean then 1 else 0 end),
  1, 'my_age_status reports a verified adult');

do $$
begin
  perform public.set_my_date_of_birth('1985-01-01'::date);
  raise exception 'FAIL: a recorded date of birth was overwritten';
exception
  when others then
    if sqlerrm like 'FAIL:%' then
      raise;
    end if;
    raise notice 'ok: recorded date of birth is immutable (%)', sqlerrm;
end;
$$;

select tests.expect(
  (select case when public.create_event(jsonb_build_object(
    'title', 'Legacy Party',
    'category', 'party',
    'venue', 'Lagos',
    'starts_at', to_jsonb(now() + interval '5 days'),
    'timezone', 'Africa/Lagos',
    'is_free', true,
    'contacts', jsonb_build_array(jsonb_build_object(
      'kind', 'whatsapp', 'caption', 'Chat on WhatsApp', 'value', '+2348000000009')))) is not null then 1 else 0 end),
  1, 'a verified previous account can publish');
select tests.expect(
  (select count(*) from public.events where organiser_id = '99999999-9999-4999-8999-999999999999'),
  1, 'exactly one event was published after verification');

reset role;

select tests.expect(
  (select count(*) from public.profiles
   where id = '99999999-9999-4999-8999-999999999999' and date_of_birth = '1990-05-05'),
  1, 'the profile row holds the date of birth');

-- Administrators can find accounts that still owe a date of birth ------------
set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', false);

select tests.expect(
  (select count(*) from public.admin_list_users()
   where id = '99999999-9999-4999-8999-999999999999' and age_verified),
  1, 'admin_list_users marks the verified account as an adult');

reset role;

\echo 'All private image and age verification checks passed.'
