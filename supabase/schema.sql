create extension if not exists pgcrypto;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new',
  transferred_at timestamptz,
  source text not null default 'public_form',
  request_type text not null default 'new_membership',
  salutation text,
  first_name text not null,
  last_name text not null,
  birth_date date,
  email text not null,
  phone text,
  mobile text,
  street text,
  postal_code text,
  city text,
  membership_kind text,
  membership_status text,
  student_status text,
  student_status_until date,
  family_members jsonb not null default '[]'::jsonb,
  accepts_statutes boolean not null default false,
  accepts_privacy boolean not null default false,
  accepts_photo_video boolean not null default false,
  accepts_whatsapp boolean not null default false,
  accepts_sepa boolean not null default false,
  iban text,
  account_holder text,
  account_holder_address text,
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  guardian_consent boolean not null default false,
  notes text,
  ebusy_match_status text not null default 'pending',
  ebusy_person_id text,
  ebusy_match_payload jsonb,
  admin_decision text,
  admin_comment text
);

create table if not exists public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null,
  note text
);

create table if not exists public.ebusy_match_candidates (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  created_at timestamptz not null default now(),
  external_person_id text,
  match_score numeric(5,2),
  match_reason text,
  payload jsonb
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  created_at timestamptz not null default now(),
  author_email text not null,
  note text not null
);

create table if not exists public.system_heartbeat (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'vercel-cron',
  last_result text not null default 'ok',
  details jsonb not null default '{}'::jsonb
);

create table if not exists public.application_form_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_mail_settings (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.internal_user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null check (role in ('admin', 'verwaltung')),
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

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row
execute function public.set_updated_at();

drop trigger if exists internal_user_profiles_set_updated_at on public.internal_user_profiles;
create trigger internal_user_profiles_set_updated_at
before update on public.internal_user_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists application_form_content_set_updated_at on public.application_form_content;
create trigger application_form_content_set_updated_at
before update on public.application_form_content
for each row
execute function public.set_updated_at();

drop trigger if exists application_mail_settings_set_updated_at on public.application_mail_settings;
create trigger application_mail_settings_set_updated_at
before update on public.application_mail_settings
for each row
execute function public.set_updated_at();

alter table public.applications enable row level security;
alter table public.application_status_history enable row level security;
alter table public.ebusy_match_candidates enable row level security;
alter table public.admin_notes enable row level security;
alter table public.system_heartbeat enable row level security;
alter table public.application_form_content enable row level security;
alter table public.application_mail_settings enable row level security;
alter table public.internal_user_profiles enable row level security;
alter table public.internal_audit_log enable row level security;

drop policy if exists "public_can_insert_applications" on public.applications;
create policy "public_can_insert_applications"
on public.applications
for insert
to anon, authenticated
with check (true);

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
revoke all on table public.system_heartbeat from anon, authenticated;
revoke all on table public.application_form_content from anon, authenticated;
revoke all on table public.application_mail_settings from anon, authenticated;
revoke all on table public.internal_user_profiles from anon, authenticated;
revoke all on table public.internal_audit_log from anon, authenticated;

grant insert on table public.applications to anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update on table public.system_heartbeat to service_role;
grant select, insert, update on table public.application_form_content to service_role;
grant select, insert, update on table public.application_mail_settings to service_role;
grant select, insert, update on table public.internal_user_profiles to service_role;
grant select, insert on table public.internal_audit_log to service_role;
