-- Oblee 0005: authorised write paths.
-- All event writes go through SECURITY DEFINER functions. The tables have no
-- INSERT/UPDATE/DELETE grants, so ownership and role rules cannot be bypassed
-- from the client, even with a valid session token.

create or replace function public.create_event(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_id uuid;
  v_starts timestamptz;
  v_timezone text := coalesce(nullif(payload ->> 'timezone', ''), 'Africa/Lagos');
  v_is_free boolean := coalesce((payload ->> 'is_free')::boolean, true);
  v_ticket jsonb;
  v_table jsonb;
  v_contact jsonb;
  v_position integer := 0;
  v_contact_count integer;
begin
  if v_uid is null then
    raise exception 'Sign in to post an event.' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is null or v_role not in ('organiser', 'admin') then
    raise exception 'Only organisers can post events.' using errcode = '42501';
  end if;

  v_starts := nullif(payload ->> 'starts_at', '')::timestamptz;
  if v_starts is null then
    raise exception 'Add a date and time for your event.';
  end if;
  if (v_starts at time zone v_timezone)::date < (now() at time zone v_timezone)::date then
    raise exception 'Pick today or a future date.';
  end if;

  if coalesce(trim(payload ->> 'title'), '') = '' or coalesce(trim(payload ->> 'venue'), '') = '' then
    raise exception 'Add an event name and a venue.';
  end if;

  v_contact_count := jsonb_array_length(coalesce(payload -> 'contacts', '[]'::jsonb));
  if v_contact_count = 0 then
    raise exception 'Add at least one RSVP contact.';
  end if;

  if not v_is_free and jsonb_array_length(coalesce(payload -> 'tickets', '[]'::jsonb)) = 0 then
    raise exception 'Pick at least one reservation mode.';
  end if;

  insert into public.events (
    organiser_id, title, category, description, venue, city, starts_at, timezone,
    visibility, security_note, identity_note, hero_image_url, color_from, color_to,
    tags, is_free, status, published_at
  )
  values (
    v_uid,
    trim(payload ->> 'title'),
    (payload ->> 'category')::public.event_category,
    coalesce(payload ->> 'description', ''),
    trim(payload ->> 'venue'),
    nullif(trim(coalesce(payload ->> 'city', '')), ''),
    v_starts,
    v_timezone,
    coalesce((payload ->> 'visibility')::public.event_visibility, 'public'),
    coalesce(payload ->> 'security_note', 'On-site security'),
    coalesce(payload ->> 'identity_note', 'ID required'),
    nullif(trim(coalesce(payload ->> 'hero_image_url', '')), ''),
    coalesce(payload ->> 'color_from', '#6a47f5'),
    coalesce(payload ->> 'color_to', '#ff4fa3'),
    array(select jsonb_array_elements_text(coalesce(payload -> 'tags', '[]'::jsonb))),
    v_is_free,
    'published',
    now()
  )
  returning id into v_id;

  for v_ticket in select * from jsonb_array_elements(coalesce(payload -> 'tickets', '[]'::jsonb))
  loop
    insert into public.event_ticket_tiers (event_id, name, price, position)
    values (v_id, v_ticket ->> 'name', (v_ticket ->> 'price')::numeric, v_position);
    v_position := v_position + 1;
  end loop;

  v_position := 0;
  for v_table in select * from jsonb_array_elements(coalesce(payload -> 'tables', '[]'::jsonb))
  loop
    insert into public.event_tables (event_id, seats, quantity, position)
    values (v_id, (v_table ->> 'seats')::integer, (v_table ->> 'quantity')::integer, v_position);
    v_position := v_position + 1;
  end loop;

  v_position := 0;
  for v_contact in select * from jsonb_array_elements(coalesce(payload -> 'contacts', '[]'::jsonb))
  loop
    insert into public.event_contacts (event_id, kind, caption, country_code, value, position)
    values (
      v_id,
      (v_contact ->> 'kind')::public.contact_kind,
      v_contact ->> 'caption',
      coalesce(v_contact ->> 'country_code', '+234'),
      v_contact ->> 'value',
      v_position
    );
    v_position := v_position + 1;
  end loop;

  return v_id;
end;
$$;

create or replace function public.update_event(p_event_id uuid, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_status public.event_status;
  v_starts timestamptz;
  v_timezone text := coalesce(nullif(payload ->> 'timezone', ''), 'Africa/Lagos');
  v_is_free boolean := coalesce((payload ->> 'is_free')::boolean, true);
  v_ticket jsonb;
  v_table jsonb;
  v_contact jsonb;
  v_position integer := 0;
begin
  if v_uid is null then
    raise exception 'Sign in to edit an event.' using errcode = '42501';
  end if;

  select organiser_id, status into v_owner, v_status
  from public.events where id = p_event_id for update;

  if v_owner is null then
    raise exception 'Event not found.';
  end if;
  if v_owner <> v_uid and not public.is_admin() then
    raise exception 'You can only edit your own events.' using errcode = '42501';
  end if;
  if v_status = 'removed' and not public.is_admin() then
    raise exception 'This event was removed by Oblee.' using errcode = '42501';
  end if;

  v_starts := nullif(payload ->> 'starts_at', '')::timestamptz;
  if v_starts is null then
    raise exception 'Add a date and time for your event.';
  end if;

  if jsonb_array_length(coalesce(payload -> 'contacts', '[]'::jsonb)) = 0 then
    raise exception 'Add at least one RSVP contact.';
  end if;
  if not v_is_free and jsonb_array_length(coalesce(payload -> 'tickets', '[]'::jsonb)) = 0 then
    raise exception 'Pick at least one reservation mode.';
  end if;

  update public.events set
    title = trim(payload ->> 'title'),
    category = (payload ->> 'category')::public.event_category,
    description = coalesce(payload ->> 'description', ''),
    venue = trim(payload ->> 'venue'),
    city = nullif(trim(coalesce(payload ->> 'city', '')), ''),
    starts_at = v_starts,
    timezone = v_timezone,
    visibility = coalesce((payload ->> 'visibility')::public.event_visibility, 'public'),
    security_note = coalesce(payload ->> 'security_note', 'On-site security'),
    identity_note = coalesce(payload ->> 'identity_note', 'ID required'),
    hero_image_url = nullif(trim(coalesce(payload ->> 'hero_image_url', '')), ''),
    color_from = coalesce(payload ->> 'color_from', '#6a47f5'),
    color_to = coalesce(payload ->> 'color_to', '#ff4fa3'),
    tags = array(select jsonb_array_elements_text(coalesce(payload -> 'tags', '[]'::jsonb))),
    is_free = v_is_free
  where id = p_event_id;

  delete from public.event_ticket_tiers where event_id = p_event_id;
  for v_ticket in select * from jsonb_array_elements(coalesce(payload -> 'tickets', '[]'::jsonb))
  loop
    insert into public.event_ticket_tiers (event_id, name, price, position)
    values (p_event_id, v_ticket ->> 'name', (v_ticket ->> 'price')::numeric, v_position);
    v_position := v_position + 1;
  end loop;

  delete from public.event_tables where event_id = p_event_id;
  v_position := 0;
  for v_table in select * from jsonb_array_elements(coalesce(payload -> 'tables', '[]'::jsonb))
  loop
    insert into public.event_tables (event_id, seats, quantity, position)
    values (p_event_id, (v_table ->> 'seats')::integer, (v_table ->> 'quantity')::integer, v_position);
    v_position := v_position + 1;
  end loop;

  delete from public.event_contacts where event_id = p_event_id;
  v_position := 0;
  for v_contact in select * from jsonb_array_elements(coalesce(payload -> 'contacts', '[]'::jsonb))
  loop
    insert into public.event_contacts (event_id, kind, caption, country_code, value, position)
    values (
      p_event_id,
      (v_contact ->> 'kind')::public.contact_kind,
      v_contact ->> 'caption',
      coalesce(v_contact ->> 'country_code', '+234'),
      v_contact ->> 'value',
      v_position
    );
    v_position := v_position + 1;
  end loop;
end;
$$;

create or replace function public.archive_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  select organiser_id into v_owner from public.events where id = p_event_id for update;
  if v_owner is null then
    raise exception 'Event not found.';
  end if;
  if v_owner <> auth.uid() and not public.is_admin() then
    raise exception 'You can only archive your own events.' using errcode = '42501';
  end if;

  update public.events
  set status = 'archived', archived_at = now()
  where id = p_event_id and status <> 'removed';
end;
$$;

create or replace function public.remove_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrators only.' using errcode = '42501';
  end if;

  update public.events
  set status = 'removed', archived_at = null
  where id = p_event_id;

  delete from public.featured_events where event_id = p_event_id;
end;
$$;

create or replace function public.set_event_featured(p_event_id uuid, p_featured boolean, p_rank integer default 0)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.event_status;
begin
  if not public.is_admin() then
    raise exception 'Administrators only.' using errcode = '42501';
  end if;

  select status into v_status from public.events where id = p_event_id;
  if v_status is null then
    raise exception 'Event not found.';
  end if;

  if p_featured then
    if v_status <> 'published' then
      raise exception 'Only published events can be featured.';
    end if;
    insert into public.featured_events (event_id, rank, created_by)
    values (p_event_id, greatest(p_rank, 0), auth.uid())
    on conflict (event_id) do update set rank = excluded.rank;
  else
    delete from public.featured_events where event_id = p_event_id;
  end if;
end;
$$;

create or replace function public.report_event(p_event_id uuid, p_reason text, p_details text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_status public.event_status;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to report an event.' using errcode = '42501';
  end if;

  select organiser_id, status into v_owner, v_status from public.events where id = p_event_id;
  if v_owner is null then
    raise exception 'Event not found.';
  end if;
  if v_owner = v_uid then
    raise exception 'You cannot report your own event.' using errcode = '42501';
  end if;
  if v_status <> 'published' then
    raise exception 'Only published events can be reported.';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Add a reason for the report.';
  end if;

  insert into public.event_reports (event_id, reporter_id, reason, details)
  values (p_event_id, v_uid, left(trim(p_reason), 120), left(coalesce(p_details, ''), 600))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.resolve_event_report(p_report_id uuid, p_status public.report_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrators only.' using errcode = '42501';
  end if;
  if p_status not in ('resolved', 'dismissed', 'reviewing') then
    raise exception 'Unsupported report status.';
  end if;

  update public.event_reports
  set status = p_status,
      resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end,
      resolved_by = case when p_status in ('resolved', 'dismissed') then auth.uid() else null end
  where id = p_report_id;
end;
$$;

create or replace function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrators only.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own role.';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  full_name text,
  email text,
  role public.user_role,
  created_at timestamptz
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
    select p.id, p.full_name, coalesce(u.email, ''), p.role, p.created_at
    from public.profiles p
    left join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

create or replace function public.promote_to_organiser()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  update public.profiles
  set role = 'organiser'
  where id = auth.uid() and role = 'attendee';
end;
$$;

revoke all on function public.promote_to_organiser() from public, anon;
grant execute on function public.promote_to_organiser() to authenticated;

revoke all on function public.create_event(jsonb) from public, anon;
revoke all on function public.update_event(uuid, jsonb) from public, anon;
revoke all on function public.archive_event(uuid) from public, anon;
revoke all on function public.remove_event(uuid) from public, anon;
revoke all on function public.set_event_featured(uuid, boolean, integer) from public, anon;
revoke all on function public.report_event(uuid, text, text) from public, anon;
revoke all on function public.resolve_event_report(uuid, public.report_status) from public, anon;
revoke all on function public.set_user_role(uuid, public.user_role) from public, anon;
revoke all on function public.admin_list_users() from public, anon;

grant execute on function public.create_event(jsonb) to authenticated;
grant execute on function public.update_event(uuid, jsonb) to authenticated;
grant execute on function public.archive_event(uuid) to authenticated;
grant execute on function public.remove_event(uuid) to authenticated;
grant execute on function public.set_event_featured(uuid, boolean, integer) to authenticated;
grant execute on function public.report_event(uuid, text, text) to authenticated;
grant execute on function public.resolve_event_report(uuid, public.report_status) to authenticated;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
