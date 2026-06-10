alter table public.applications
  add column if not exists source text not null default 'public_form';

alter table public.applications
  add column if not exists request_type text not null default 'new_membership';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'applications_request_type_check'
      and conrelid = 'public.applications'::regclass
  ) then
    alter table public.applications
      add constraint applications_request_type_check
      check (request_type in ('new_membership', 'membership_extension'));
  end if;
end $$;

create index if not exists applications_request_type_idx
on public.applications (request_type);
