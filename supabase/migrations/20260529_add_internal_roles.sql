create table if not exists public.internal_user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null check (role in ('admin', 'verwaltung', 'vorstand_lesen', 'technik')),
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists internal_user_profiles_email_lower_key
on public.internal_user_profiles (lower(email));

create index if not exists internal_user_profiles_role_idx
on public.internal_user_profiles (role);

create index if not exists internal_user_profiles_status_idx
on public.internal_user_profiles (status);

create table if not exists public.internal_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists internal_audit_log_created_at_idx
on public.internal_audit_log (created_at desc);

create index if not exists internal_audit_log_actor_user_id_idx
on public.internal_audit_log (actor_user_id);

create index if not exists internal_audit_log_entity_idx
on public.internal_audit_log (entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists internal_user_profiles_set_updated_at on public.internal_user_profiles;
create trigger internal_user_profiles_set_updated_at
before update on public.internal_user_profiles
for each row
execute function public.set_updated_at();

alter table public.internal_user_profiles enable row level security;
alter table public.internal_audit_log enable row level security;

revoke all on table public.internal_user_profiles from anon, authenticated;
revoke all on table public.internal_audit_log from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update on table public.internal_user_profiles to service_role;
grant select, insert on table public.internal_audit_log to service_role;

drop policy if exists "authenticated_can_read_applications" on public.applications;
drop policy if exists "authenticated_can_update_applications" on public.applications;
drop policy if exists "authenticated_can_read_status_history" on public.application_status_history;
drop policy if exists "authenticated_can_write_status_history" on public.application_status_history;
drop policy if exists "authenticated_can_read_match_candidates" on public.ebusy_match_candidates;
drop policy if exists "authenticated_can_write_match_candidates" on public.ebusy_match_candidates;
drop policy if exists "authenticated_can_read_admin_notes" on public.admin_notes;
drop policy if exists "authenticated_can_write_admin_notes" on public.admin_notes;

revoke all on table public.applications from anon, authenticated;
revoke all on table public.application_status_history from anon, authenticated;
revoke all on table public.ebusy_match_candidates from anon, authenticated;
revoke all on table public.admin_notes from anon, authenticated;
grant insert on table public.applications to anon, authenticated;
