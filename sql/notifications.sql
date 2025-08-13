-- Notifications table and RLS
create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null check (type in ('info','success','warning','error','system')),
  title text not null,
  message text not null,
  link text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_read_idx on public.notifications (user_id, read_at);
create index if not exists notifications_created_idx on public.notifications (created_at desc);

alter table public.notifications enable row level security;

-- Allow users to read their own notifications
drop policy if exists notifications_select_self on public.notifications;
create policy notifications_select_self on public.notifications
  for select using (auth.uid() = user_id);

-- Allow users to mark their own notifications as read
drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Optionally allow users to insert notifications for themselves (not required if only server inserts)
drop policy if exists notifications_insert_self on public.notifications;
create policy notifications_insert_self on public.notifications
  for insert with check (auth.uid() = user_id);


