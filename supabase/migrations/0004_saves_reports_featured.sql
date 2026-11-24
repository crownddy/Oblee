-- Oblee 0004: saves, reports and administrator-managed featured events
create table if not exists public.saved_events (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists saved_events_user_idx on public.saved_events (user_id, created_at desc);
create index if not exists saved_events_event_idx on public.saved_events (event_id);

create table if not exists public.event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 120),
  details text not null default '' check (char_length(details) <= 600),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);

create unique index if not exists event_reports_one_open_per_user
  on public.event_reports (event_id, reporter_id)
  where status in ('open', 'reviewing');

create index if not exists event_reports_status_idx on public.event_reports (status, created_at desc);

-- Featured placement is a separate, administrator-owned record. Organisers
-- have no write path to it at all.
create table if not exists public.featured_events (
  event_id uuid primary key references public.events (id) on delete cascade,
  rank integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists featured_events_rank_idx on public.featured_events (rank, created_at);
