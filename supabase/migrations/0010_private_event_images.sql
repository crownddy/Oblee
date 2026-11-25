-- Oblee 0010: private event images.
--
-- The bucket stops serving public URLs. Every cover is read through a signed URL
-- minted for a viewer who may already see the event, so a private event's image
-- cannot be fetched by anyone else and a guessed URL no longer works.
--
-- events.hero_image_url holds either an https link (external artwork) or an
-- object path inside the bucket, e.g. '<organiser-uuid>/<image-uuid>.jpg'.

update storage.buckets
set public = false
where id = 'event-images';

-- Covers uploaded while the bucket was public were stored as public URLs. Keep
-- the object and store its path instead, so policy and signing can match exactly.
update public.events
set hero_image_url = split_part(hero_image_url, '/event-images/', 2)
where hero_image_url like '%/storage/v1/object/public/event-images/%';

create or replace function public.can_read_event_image(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_name is not null
    and p_name <> ''
    and (
      -- The uploader always sees their own files, including drafts.
      (storage.foldername(p_name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1
        from public.events e
        where public.can_view_event(e.id)
          and (
            e.hero_image_url = p_name
            or e.hero_image_url like '%/event-images/' || p_name
          )
      )
    );
$$;

revoke all on function public.can_read_event_image(text) from public, anon, authenticated;
grant execute on function public.can_read_event_image(text) to anon, authenticated;

drop policy if exists "Event images are publicly readable" on storage.objects;
drop policy if exists "Event images are readable by authorised viewers" on storage.objects;
create policy "Event images are readable by authorised viewers"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'event-images' and public.can_read_event_image(name));

-- An event may only point at a cover in its own organiser's folder, so one account
-- can never attach another organiser's upload (and get it signed on their behalf).
create or replace function public.enforce_event_image_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.hero_image_url is not null
    and new.hero_image_url not like 'https://%'
    and split_part(new.hero_image_url, '/', 1) <> new.organiser_id::text then
    raise exception 'Upload the event image through Oblee.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists events_own_image_folder on public.events;
create trigger events_own_image_folder
  before insert or update on public.events
  for each row execute function public.enforce_event_image_owner();
