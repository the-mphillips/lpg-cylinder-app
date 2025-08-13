-- Store notification preferences in users table as JSONB
alter table public.users
  add column if not exists notification_settings jsonb not null default '{"mute_all":false,"toast_enabled":true,"email_enabled":false,"types":{"info":true,"success":true,"warning":true,"error":true,"system":true}}';


