create table if not exists public.application_form_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists application_form_content_set_updated_at on public.application_form_content;
create trigger application_form_content_set_updated_at
before update on public.application_form_content
for each row
execute function public.set_updated_at();

alter table public.application_form_content enable row level security;

revoke all on table public.application_form_content from anon, authenticated;
grant select, insert, update on table public.application_form_content to service_role;
