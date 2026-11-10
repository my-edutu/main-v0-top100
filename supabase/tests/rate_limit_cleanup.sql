\set ON_ERROR_STOP on
begin;

do $$
declare
  active_key text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  expired_key text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  checked record;
  cleanup_seed double precision;
begin
  insert into public.api_rate_limits(key_hash, request_count, reset_at, updated_at)
  values (expired_key, 1, now() - interval '2 days', now() - interval '2 days');

  -- Find a seed on this PostgreSQL version that makes the next draw enter cleanup.
  for candidate in 0..1000 loop
    perform setseed(candidate / 1000.0);
    if random() < 0.01 then
      cleanup_seed := candidate / 1000.0;
      exit;
    end if;
  end loop;
  if cleanup_seed is null then
    raise exception 'Unable to exercise the rate limit cleanup branch';
  end if;

  perform setseed(cleanup_seed);
  select * into checked from public.consume_api_rate_limit(active_key, 5, 60);
  if checked.allowed is distinct from true or checked.request_count is distinct from 1 then
    raise exception 'Cleanup changed the result of the current rate limit request';
  end if;
  if exists (select 1 from public.api_rate_limits where key_hash = expired_key) then
    raise exception 'Cleanup did not remove the expired rate limit key';
  end if;
  if not exists (select 1 from public.api_rate_limits where key_hash = active_key) then
    raise exception 'Cleanup removed the active rate limit key';
  end if;
end;
$$;

rollback;
