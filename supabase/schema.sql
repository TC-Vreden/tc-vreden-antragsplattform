create extension if not exists pgcrypto;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new',
  source text not null default 'public_form',
  request_type text not null default 'new_membership',
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

alter table public.applications enable row level security;
alter table public.application_status_history enable row level security;
alter table public.ebusy_match_candidates enable row level security;
alter table public.admin_notes enable row level security;

drop policy if exists "public_can_insert_applications" on public.applications;
create policy "public_can_insert_applications"
on public.applications
for insert
to anon, authenticated
with check (true);

drop policy if exists "authenticated_can_read_applications" on public.applications;
create policy "authenticated_can_read_applications"
on public.applications
for select
to authenticated
using (true);

drop policy if exists "authenticated_can_update_applications" on public.applications;
create policy "authenticated_can_update_applications"
on public.applications
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated_can_read_status_history" on public.application_status_history;
create policy "authenticated_can_read_status_history"
on public.application_status_history
for select
to authenticated
using (true);

drop policy if exists "authenticated_can_write_status_history" on public.application_status_history;
create policy "authenticated_can_write_status_history"
on public.application_status_history
for insert
to authenticated
with check (true);

drop policy if exists "authenticated_can_read_match_candidates" on public.ebusy_match_candidates;
create policy "authenticated_can_read_match_candidates"
on public.ebusy_match_candidates
for select
to authenticated
using (true);

drop policy if exists "authenticated_can_write_match_candidates" on public.ebusy_match_candidates;
create policy "authenticated_can_write_match_candidates"
on public.ebusy_match_candidates
for insert
to authenticated
with check (true);

drop policy if exists "authenticated_can_read_admin_notes" on public.admin_notes;
create policy "authenticated_can_read_admin_notes"
on public.admin_notes
for select
to authenticated
using (true);

drop policy if exists "authenticated_can_write_admin_notes" on public.admin_notes;
create policy "authenticated_can_write_admin_notes"
on public.admin_notes
for insert
to authenticated
with check (true);
