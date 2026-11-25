-- Oblee 0009: 18+ age restriction.
--
-- The date of birth is the only age signal Oblee stores. No identity document,
-- ID number or image is collected or kept. The sign-up trigger refuses to create
-- a profile for anyone under 18, so the rule holds even if a client skips the form.

alter table public.profiles add column if not exists date_of_birth date;

alter table public.profiles drop constraint if exists profiles_adult_check;
alter table public.profiles add constraint profiles_adult_check
  check (
    date_of_birth is null
    or date_of_birth <= (current_date - interval '18 years')::date
  );

-- The column stays out of the API surface entirely: the existing column grants on
-- public.profiles do not include date_of_birth, so no client can read it back.
revoke all on public.profiles from anon, authenticated;
grant select (id, full_name, role, avatar_url, created_at) on public.profiles to anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  display_name text;
  raw_dob text;
  dob date;
begin
  raw_dob := nullif(trim(coalesce(new.raw_user_meta_data ->> 'date_of_birth', '')), '');
  if raw_dob is null then
    raise exception 'A date of birth is required. Oblee is for people aged 18 and over.';
  end if;

  begin
    dob := raw_dob::date;
  exception when others then
    raise exception 'Enter a valid date of birth.';
  end;

  if dob > (current_date - interval '18 years')::date then
    raise exception 'You must be at least 18 years old to use Oblee.';
  end if;

  requested_role := case
    when coalesce(new.raw_user_meta_data ->> 'role', '') = 'organiser' then 'organiser'::public.user_role
    else 'attendee'::public.user_role
  end;

  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, 'Oblee member'), '@', 1)
  );

  insert into public.profiles (id, full_name, role, date_of_birth)
  values (new.id, left(display_name, 80), requested_role, dob)
  on conflict (id) do nothing;

  return new;
end;
$$;
