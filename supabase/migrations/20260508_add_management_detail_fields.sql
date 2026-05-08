alter table public.applications
  add column if not exists transferred_at timestamptz,
  add column if not exists salutation text,
  add column if not exists guardian_name text,
  add column if not exists guardian_email text,
  add column if not exists guardian_phone text,
  add column if not exists guardian_consent boolean not null default false;
