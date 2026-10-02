-- Avoid a database-wide delete scan in every rate-limit request. Cleanup is
-- opportunistic, probabilistic, and bounded to at most 500 expired keys.
create or replace function public.consume_api_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  request_count integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_reset_at timestamptz;
begin
  if p_key_hash is null or length(p_key_hash) <> 64 then
    raise exception 'Invalid rate-limit key hash';
  end if;
  if p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'Rate-limit values must be positive';
  end if;
  if p_limit > 100000 or p_window_seconds > 86400 then
    raise exception 'Rate-limit values exceed allowed bounds';
  end if;

  insert into public.api_rate_limits as limits (key_hash, request_count, reset_at, updated_at)
  values (p_key_hash, 1, v_now + make_interval(secs => p_window_seconds), v_now)
  on conflict (key_hash) do update
    set request_count = case when limits.reset_at <= v_now then 1 else limits.request_count + 1 end,
        reset_at = case when limits.reset_at <= v_now then v_now + make_interval(secs => p_window_seconds) else limits.reset_at end,
        updated_at = v_now
  returning limits.request_count, limits.reset_at into v_count, v_reset_at;

  if random() < 0.01 then
    delete from public.api_rate_limits as stale
    where stale.key_hash in (
      select key_hash from public.api_rate_limits
      where reset_at < v_now - interval '1 day'
      order by reset_at
      limit 500
    );
  end if;

  return query select v_count <= p_limit, v_count, greatest(p_limit - v_count, 0), v_reset_at;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;
