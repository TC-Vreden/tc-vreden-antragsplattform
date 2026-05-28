create table if not exists public.system_heartbeat (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'vercel-cron',
  last_result text not null default 'ok',
  details jsonb not null default '{}'::jsonb
);

alter table public.system_heartbeat enable row level security;

revoke all on table public.system_heartbeat from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update on table public.system_heartbeat to service_role;
