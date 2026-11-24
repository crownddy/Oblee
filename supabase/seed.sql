-- Oblee development seed. Local development only — never run against production.
-- Creates a demo organiser and a demo administrator, both with the password
-- below, plus a handful of events. The app's preview mode (no Supabase
-- credentials) already renders a fuller read-only catalogue.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated', 'organiser@oblee.test',
    crypt('oblee-demo-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ada Oblee","role":"organiser","date_of_birth":"1990-04-12"}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated', 'authenticated', 'admin@oblee.test',
    crypt('oblee-demo-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Oblee Admin","role":"attendee","date_of_birth":"1988-09-30"}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated', 'authenticated', 'attendee@oblee.test',
    crypt('oblee-demo-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Tunde Guest","role":"attendee","date_of_birth":"1996-01-22"}',
    now(), now()
  )
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
   jsonb_build_object('sub', '11111111-1111-4111-8111-111111111111', 'email', 'organiser@oblee.test', 'email_verified', true),
   'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222',
   jsonb_build_object('sub', '22222222-2222-4222-8222-222222222222', 'email', 'admin@oblee.test', 'email_verified', true),
   'email', now(), now(), now()),
  (gen_random_uuid(), '33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333',
   jsonb_build_object('sub', '33333333-3333-4333-8333-333333333333', 'email', 'attendee@oblee.test', 'email_verified', true),
   'email', now(), now(), now())
on conflict do nothing;

-- The role guard trigger blocks role changes made outside an administrator
-- session, which is exactly what we want in production. For this local seed we
-- briefly disable it so the demo administrator can be created.
alter table public.profiles disable trigger profiles_guard_role;
update public.profiles set role = 'admin' where id = '22222222-2222-4222-8222-222222222222';
alter table public.profiles enable trigger profiles_guard_role;

insert into public.events (
  id, organiser_id, title, category, description, venue, city, starts_at, timezone,
  visibility, security_note, identity_note, color_from, color_to, tags, is_free, status, published_at
)
values
  (
    'aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
    'Afro Vibes Night', 'concert',
    'Live afro music, great drinks and a dance floor that stays full until late.',
    'Lekki', 'Lagos', now() + interval '3 days', 'Africa/Lagos',
    'public', 'On-site security', 'ID required', '#6a47f5', '#ff4fa3',
    array['afrobeats', 'live music'], false, 'published', now()
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
    'Sunset Brunch', 'food',
    'Bottomless brunch, amapiano and a sunset terrace with a view.',
    'Ikoyi', 'Lagos', now() + interval '1 day', 'Africa/Lagos',
    'public', 'On-site security', 'No ID needed', '#ff4fa3', '#ffb347',
    array['brunch', 'amapiano'], false, 'published', now()
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
    'Detty Rave', 'music',
    'Three DJs, one beach and no early exits. Afro house until sunrise.',
    'Lekki', 'Lagos', now(), 'Africa/Lagos',
    'public', 'Licensed guards and medic', '18+ ID check (NIN, Driver''s License)', '#6a47f5', '#ff4fa3',
    array['rave', 'afro house'], true, 'published', now()
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111',
    'Owambe Saturday', 'owambe',
    'Aso ebi, live band, talking drums and plenty of jollof. Come dressed to shine.',
    'Ikeja', 'Lagos', now() + interval '6 days', 'Africa/Lagos',
    'public', 'Bag checks at entry', 'ID required', '#ff4fa3', '#ffb347',
    array['owambe'], false, 'published', now()
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111',
    'Abuja Jazz Evening', 'concert',
    'Smooth jazz under the stars in the garden of a boutique hotel.',
    'Maitama', 'Abuja', now() + interval '10 days', 'Africa/Lagos',
    'public', 'On-site security', 'ID required', '#16b6ff', '#8a3dff',
    array[]::text[], false, 'published', now()
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111',
    'Founders Mixer', 'network',
    'Meet builders, designers and investors over drinks. Come with a pitch ready.',
    'Yaba', 'Lagos', now() + interval '2 days', 'Africa/Lagos',
    'public', 'On-site security', 'ID required', '#2ad4a0', '#5b3df0',
    array[]::text[], true, 'published', now()
  )
on conflict (id) do nothing;

insert into public.event_ticket_tiers (event_id, name, price, position)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Regular', 20000, 0),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'VIP', 45000, 1),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Regular', 15000, 0),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Regular', 30000, 0),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'VIP', 70000, 1),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'Regular', 18000, 0),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'VIP', 40000, 1)
on conflict (event_id, name) do nothing;

insert into public.event_tables (event_id, seats, quantity, position)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 4, 10, 0),
  ('aaaaaaaa-0000-4000-8000-000000000001', 6, 4, 1),
  ('aaaaaaaa-0000-4000-8000-000000000004', 10, 6, 0)
on conflict do nothing;

insert into public.event_contacts (event_id, kind, caption, country_code, value, position)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'whatsapp', 'Chat on WhatsApp', '+234', '8012345678', 0),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'email', 'Send an email', '+234', 'events@oblee.test', 1),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'call', 'Call to reserve', '+234', '8023456789', 0)
on conflict (event_id, kind, value) do nothing;

insert into public.featured_events (event_id, rank, created_by)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 0, '22222222-2222-4222-8222-222222222222'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 1, '22222222-2222-4222-8222-222222222222'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 2, '22222222-2222-4222-8222-222222222222')
on conflict (event_id) do nothing;
