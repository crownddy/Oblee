-- Oblee 0011: verify existing accounts.
--
-- Accounts created before the 18+ rule have no date_of_birth. They keep reading
-- and saving events, but the server refuses to publish, edit or restore events
-- for them until they submit a date of birth that passes the 18+ check here.
--
-- Only the date is stored. No identity document, ID number or image is asked for
-- or kept, and the column is not exposed through the API (see 0009).

create index if not exists events_hero_image_url_idx on public.events (hero_image_url);

create or replace function public.is_verified_adult(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = coalesce(p_user_id, auth.uid())
      and p.date_of_birth is not null
      and p.date_of_birth <= (current_date - interval '18 years')::date
  );
$$;

create or replace function public.my_age_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'date_of_birth', p.date_of_birth,
    'has_date_of_birth', p.date_of_birth is not null,
    'is_adult', p.date_of_birth is not null
      and p.date_of_birth <= (current_date - interval '18 years')::date
  )
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.set_my_date_of_birth(p_date_of_birth date)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existing date;
begin
  if v_uid is null then
    raise exception 'Sign in to verify your age.' using errcode = '42501';
  end if;
  if p_date_of_birth is null then
    raise exception 'A date of birth is required. Oblee is for people aged 18 and over.';
  end if;
  if p_date_of_birth > current_date then
    raise exception 'Enter a valid date of birth.';
  end if;
  if p_date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'You must be at least 18 years old to use Oblee.';
  end if;

  select date_of_birth into v_existing from public.profiles where id = v_uid for update;
  if v_existing is not null then
    raise exception 'Your date of birth is already recorded.';
  end if;

  update public.profiles set date_of_birth = p_date_of_birth where id = v_uid;
  return p_date_of_birth;
end;
$$;

-- Every path that publishes an event ends in an INSERT or UPDATE of public.events,
-- so one trigger covers the client, the RPCs and any future write path.
create or replace function public.enforce_verified_organiser()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and not public.is_admin() and not public.is_verified_adult(new.organiser_id) then
    raise exception 'Verify your age before publishing events.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists events_require_verified_adult on public.events;
create trigger events_require_verified_adult
  before insert or update on public.events
  for each row execute function public.enforce_verified_organiser();

-- Administrators need to see which accounts still owe a date of birth.
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  id uuid,
  full_name text,
  email text,
  role public.user_role,
  created_at timestamptz,
  age_verified boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrators only.' using errcode = '42501';
  end if;

  return query
    select
      p.id,
      p.full_name,
      coalesce(u.email, ''),
      p.role,
      p.created_at,
      p.date_of_birth is not null
        and p.date_of_birth <= (current_date - interval '18 years')::date
    from public.profiles p
    left join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

revoke all on function public.is_verified_adult(uuid) from public, anon, authenticated;
revoke all on function public.my_age_status() from public, anon;
revoke all on function public.set_my_date_of_birth(date) from public, anon;
revoke all on function public.admin_list_users() from public, anon;

grant execute on function public.my_age_status() to authenticated;
grant execute on function public.set_my_date_of_birth(date) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
