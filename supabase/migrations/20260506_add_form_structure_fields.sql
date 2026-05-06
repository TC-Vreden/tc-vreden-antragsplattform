alter table public.applications
  add column if not exists student_status_until date;

alter table public.applications
  add column if not exists family_members jsonb;

update public.applications
set family_members = '[]'::jsonb
where family_members is null;

alter table public.applications
  alter column family_members set default '[]'::jsonb,
  alter column family_members set not null;
