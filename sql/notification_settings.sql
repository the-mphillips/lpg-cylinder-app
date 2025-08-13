-- Per-user notification settings with RLS
create table if not exists public.notification_settings (
  user_id uuid primary key,
  mute_all boolean not null default false,
  toast_enabled boolean not null default true,
  email_enabled boolean not null default false,
  types jsonb not null default '{"info":true,"success":true,"warning":true,"error":true,"system":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_settings_updated_idx on public.notification_settings (updated_at desc);

alter table public.notification_settings enable row level security;

drop policy if exists notification_settings_select_self on public.notification_settings;
create policy notification_settings_select_self on public.notification_settings
  for select using (user_id = (select auth.uid()));

drop policy if exists notification_settings_upsert_self on public.notification_settings;
create policy notification_settings_upsert_self on public.notification_settings
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Ensure row exists helper (optional: can be done app-side by upsert)

