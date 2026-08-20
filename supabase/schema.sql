-- Fetch v0.4.0 — namespaced schema for the shared personal Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.fetch_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  domain text not null,
  category text not null,
  capture_type text not null default 'Page' check (capture_type in ('Page','Text','Image link')),
  selected_text text,
  image_url text,
  note text,
  page_date date,
  screenshot_path text,
  starred boolean not null default false,
  saved_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.fetch_capture_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists fetch_items_user_saved_idx on public.fetch_items (user_id, saved_at desc);
create index if not exists fetch_items_user_category_idx on public.fetch_items (user_id, category);
create index if not exists fetch_items_user_domain_idx on public.fetch_items (user_id, domain);
create index if not exists fetch_items_user_page_date_idx on public.fetch_items (user_id, page_date desc);
create index if not exists fetch_capture_devices_user_idx on public.fetch_capture_devices (user_id, created_at desc);

alter table public.fetch_items enable row level security;
alter table public.fetch_capture_devices enable row level security;

grant select, insert, update, delete on public.fetch_items to authenticated;
grant select, insert, update, delete on public.fetch_capture_devices to authenticated;

-- Fetch items: signed-in users can only see and change their own rows.
drop policy if exists "Fetch users read own items" on public.fetch_items;
create policy "Fetch users read own items" on public.fetch_items
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Fetch users insert own items" on public.fetch_items;
create policy "Fetch users insert own items" on public.fetch_items
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Fetch users update own items" on public.fetch_items;
create policy "Fetch users update own items" on public.fetch_items
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Fetch users delete own items" on public.fetch_items;
create policy "Fetch users delete own items" on public.fetch_items
for delete to authenticated using ((select auth.uid()) = user_id);

-- Device-token rows are also private to their owner. Only token hashes are stored.
drop policy if exists "Fetch users read own capture devices" on public.fetch_capture_devices;
create policy "Fetch users read own capture devices" on public.fetch_capture_devices
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Fetch users insert own capture devices" on public.fetch_capture_devices;
create policy "Fetch users insert own capture devices" on public.fetch_capture_devices
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Fetch users update own capture devices" on public.fetch_capture_devices;
create policy "Fetch users update own capture devices" on public.fetch_capture_devices
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Fetch users delete own capture devices" on public.fetch_capture_devices;
create policy "Fetch users delete own capture devices" on public.fetch_capture_devices
for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fetch-screenshots', 'fetch-screenshots', false, 1048576, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public=false, file_size_limit=1048576, allowed_mime_types=array['image/webp','image/jpeg','image/png'];

drop policy if exists "Fetch users read own screenshots" on storage.objects;
create policy "Fetch users read own screenshots" on storage.objects
for select to authenticated
using (bucket_id = 'fetch-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
