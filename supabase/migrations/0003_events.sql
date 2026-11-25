-- Oblee 0003: events and their reservation / contact details
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organiser_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  category public.event_category not null,
  description text not null default '' check (char_length(description) <= 500),
  venue text not null check (char_length(venue) between 3 and 160),
  city text,
  starts_at timestamptz not null,
  timezone text not null default 'Africa/Lagos',
  visibility public.event_visibility not null default 'public',
  security_note text not null default 'On-site security',
  identity_note text not null default 'ID required',
  hero_image_url text,
  color_from text not null default '#6a47f5' check (color_from ~ '^#[0-9a-fA-F]{6}$'),
  color_to text not null default '#ff4fa3' check (color_to ~ '^#[0-9a-fA-F]{6}$'),
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  is_free boolean not null default true,
  status public.event_status not null default 'published',
  published_at timestamptz default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_archived_state check ((status = 'archived') = (archived_at is not null))
);

create index if not exists events_status_starts_idx on public.events (status, starts_at);
create index if not exists events_starts_idx on public.events (starts_at);
create index if not exists events_category_idx on public.events (category);
create index if not exists events_organiser_idx on public.events (organiser_id, status);
create index if not exists events_tags_idx on public.events using gin (tags);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create table if not exists public.event_ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (name in ('Regular', 'VIP', 'VVIP')),
  price numeric(12, 2) not null check (price > 0),
  position integer not null default 0,
  unique (event_id, name)
);

create table if not exists public.event_tables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  seats integer not null check (seats between 1 and 100),
  quantity integer not null check (quantity between 1 and 500),
  position integer not null default 0
);

create table if not exists public.event_contacts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind public.contact_kind not null,
  caption text not null check (char_length(caption) between 2 and 60),
  country_code text not null default '+234' check (country_code ~ '^\+\d{1,4}$'),
  value text not null check (char_length(value) between 1 and 160),
  position integer not null default 0,
  unique (event_id, kind, value)
);

create index if not exists event_ticket_tiers_event_idx on public.event_ticket_tiers (event_id);
create index if not exists event_tables_event_idx on public.event_tables (event_id);
create index if not exists event_contacts_event_idx on public.event_contacts (event_id);
