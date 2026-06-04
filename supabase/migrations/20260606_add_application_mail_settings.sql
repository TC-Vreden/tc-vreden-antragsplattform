create table if not exists public.application_mail_settings (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists application_mail_settings_set_updated_at on public.application_mail_settings;
create trigger application_mail_settings_set_updated_at
before update on public.application_mail_settings
for each row
execute function public.set_updated_at();

alter table public.application_mail_settings enable row level security;

revoke all on table public.application_mail_settings from anon, authenticated;
grant select, insert, update on table public.application_mail_settings to service_role;
