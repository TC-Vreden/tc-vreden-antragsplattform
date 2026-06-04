update public.internal_user_profiles
set role = 'verwaltung'
where role in ('vorstand_lesen', 'technik');

alter table public.internal_user_profiles
drop constraint if exists internal_user_profiles_role_check;

alter table public.internal_user_profiles
add constraint internal_user_profiles_role_check
check (role in ('admin', 'verwaltung'));
