-- Oblee 0013: archiving an event also clears its featured placement
--
-- archive_event used to leave the featured_events row behind, so an archived
-- event kept holding one of the carousel's ranked slots while the app dropped it
-- from the result. Archiving now cleans up the placement exactly as remove_event
-- already does. Replaces the 0005 body; authorization rules and the status change
-- are untouched, and both statements commit together.

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

  delete from public.featured_events where event_id = p_event_id;
end;
$$;
