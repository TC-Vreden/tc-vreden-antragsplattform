create or replace function public.touch_system_heartbeat()
returns table (id text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  insert into public.system_heartbeat as heartbeat (
    id,
    updated_at,
    source,
    last_result,
    details
  )
  values (
    'supabase-free-plan-heartbeat',
    now(),
    'vercel-cron-anon-rpc',
    'ok',
    jsonb_build_object(
      'triggeredAt', now(),
      'path', 'public.touch_system_heartbeat'
    )
  )
  on conflict on constraint system_heartbeat_pkey do update
    set updated_at = excluded.updated_at,
        source = excluded.source,
        last_result = excluded.last_result,
        details = excluded.details
  returning heartbeat.id, heartbeat.updated_at;
end;
$$;

revoke all on function public.touch_system_heartbeat() from public;
grant usage on schema public to anon;
grant execute on function public.touch_system_heartbeat() to anon;
