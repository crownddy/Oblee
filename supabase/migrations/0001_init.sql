-- Oblee 0001: extensions, enums, shared helpers
create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('attendee', 'organiser', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_status as enum ('published', 'archived', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_visibility as enum ('public', 'private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_category as enum (
    'party', 'music', 'concert', 'festival', 'food', 'network',
    'fashion_show', 'webinar', 'carnival', 'owambe', 'trade_show'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contact_kind as enum ('whatsapp', 'call', 'email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when the caller is an administrator. SECURITY DEFINER so it can read
-- profiles without recursing through RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
