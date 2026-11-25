-- Oblee 0002: profiles, sign-up trigger and self-escalation guards
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  role public.user_role not null default 'attendee',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Creates the profile for every new auth user. The requested role comes from
-- sign-up metadata but only 'attendee' and 'organiser' are ever accepted, so a
-- crafted payload can never create an administrator.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  display_name text;
begin
  requested_role := case
    when coalesce(new.raw_user_meta_data ->> 'role', '') = 'organiser' then 'organiser'::public.user_role
    else 'attendee'::public.user_role
  end;

  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, 'Oblee member'), '@', 1)
  );

  insert into public.profiles (id, full_name, role)
  values (new.id, left(display_name, 80), requested_role)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role changes and ownership of the id are only possible for administrators.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'A profile id cannot be changed.' using errcode = '42501';
  end if;
  if new.role is distinct from old.role
     and not public.is_admin()
     and not (old.id = auth.uid() and old.role = 'attendee' and new.role = 'organiser') then
    raise exception 'Only administrators can change roles.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

alter table public.profiles enable row level security;

drop policy if exists "Profiles are readable" on public.profiles;
create policy "Profiles are readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "People can update their own profile" on public.profiles;
create policy "People can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Column-level grants keep emails out of the public API. Email addresses are
-- only exposed to administrators through admin_list_users().
revoke all on public.profiles from anon, authenticated;
grant select (id, full_name, role, avatar_url, created_at) on public.profiles to anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

