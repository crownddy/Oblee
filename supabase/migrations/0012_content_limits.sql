-- Oblee 0012: bound the text a direct RPC call can store.
--
-- The Server Actions validate these fields, but a client can call create_event()
-- and update_event() straight from PostgREST. Unbounded short-text fields let an
-- organiser persist megabytes on their own row, and an unusable timezone made the
-- formatters throw, which broke the public listing pages. The table is the last
-- line of defence, so the limits live here as well.

create or replace function public.is_valid_timezone(p_timezone text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (select 1 from pg_timezone_names where lower(name) = lower(p_timezone));
$$;

revoke all on function public.is_valid_timezone(text) from public, anon;
grant execute on function public.is_valid_timezone(text) to authenticated;

alter table public.events drop constraint if exists events_timezone_valid;
alter table public.events add constraint events_timezone_valid
  check (public.is_valid_timezone(timezone));

alter table public.events drop constraint if exists events_text_lengths;
alter table public.events add constraint events_text_lengths
  check (
    char_length(security_note) <= 120
    and char_length(identity_note) <= 120
    and (city is null or char_length(city) <= 80)
    and (hero_image_url is null or char_length(hero_image_url) <= 600)
  );
